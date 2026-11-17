import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import db from "./db.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../public");

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://cdn.conferbot.com"],
      "connect-src": ["'self'", "https://*.conferbot.com", "wss://*.conferbot.com"],
      "frame-src": ["'self'", "https://*.conferbot.com"],
      "img-src": ["'self'", "data:", "https://images.unsplash.com", "https://*.conferbot.com"]
    }
  }
}));

app.use(express.json({ limit: "20kb" }));
app.use(express.static(publicDir));

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait a minute and try again." }
});

const recipeQuery = db.prepare(`
SELECT r.id, r.title, r.description, r.cuisine, r.prep_minutes, r.cook_minutes,
       r.servings, r.difficulty,
       GROUP_CONCAT(CASE WHEN ri.is_pantry_staple=0 THEN i.normalized_name END, ',') AS ingredients,
       GROUP_CONCAT(CASE WHEN ri.is_pantry_staple=1 THEN i.normalized_name END, ',') AS staples
FROM recipes r
LEFT JOIN recipe_ingredients ri ON ri.recipe_id=r.id
LEFT JOIN ingredients i ON i.id=ri.ingredient_id
WHERE r.is_published=1
GROUP BY r.id ORDER BY r.title
`);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.get("/api/recipes", (_req, res) => {
  const recipes = recipeQuery.all().map(r => {
    const steps = db.prepare(
      "SELECT instruction FROM recipe_steps WHERE recipe_id=? ORDER BY step_number"
    ).all(r.id).map(row => row.instruction);
    const totalMinutes = r.prep_minutes + r.cook_minutes;
    return {
      ...r,
      time: totalMinutes,
      total_minutes: totalMinutes,
      ingredients: (r.ingredients || "").split(",").filter(Boolean),
      staples: (r.staples || "").split(",").filter(Boolean),
      steps
    };
  });
  res.json({ recipes });
});

app.get("/api/pantry", (req, res) => {
  const userId = String(req.query.userId || "demo-user").slice(0, 80);
  const items = db.prepare(`
    SELECT i.normalized_name AS name, p.quantity
    FROM pantry_items p JOIN ingredients i ON i.id=p.ingredient_id
    WHERE p.user_id=? ORDER BY i.normalized_name
  `).all(userId);
  res.json({ items });
});

app.put("/api/pantry", (req, res) => {
  const userId = String(req.body.userId || "demo-user").slice(0, 80);
  const items = req.body.items;
  if (!Array.isArray(items) || items.length > 100 || items.some(x => typeof x !== "string" || x.length > 60)) {
    return res.status(400).json({ error: "items must be an array of up to 100 ingredient names." });
  }
  const normalize = s => s.trim().toLowerCase().replace(/\s+/g, " ");
  const save = db.transaction(() => {
    db.prepare("DELETE FROM pantry_items WHERE user_id=?").run(userId);
    for (const raw of items) {
      const name = normalize(raw);
      if (!name) continue;
      db.prepare("INSERT INTO ingredients(name,normalized_name) VALUES (?,?) ON CONFLICT(normalized_name) DO NOTHING").run(name, name);
      const ingredient = db.prepare("SELECT id FROM ingredients WHERE normalized_name=?").get(name);
      db.prepare("INSERT INTO pantry_items(user_id,ingredient_id) VALUES (?,?) ON CONFLICT(user_id,ingredient_id) DO NOTHING").run(userId, ingredient.id);
    }
  });
  save();
  res.json({ ok: true, count: items.length });
});


const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isBusy = (err) =>
  [429, 503].includes(Number(err?.status)) ||
  /503|UNAVAILABLE|high demand|RESOURCE_EXHAUSTED/i.test(String(err?.message));

// Gemini 3 models use thinkingLevel; 2.5 models use thinkingBudget
const thinkingFor = (model) =>
  /gemini-3/.test(model) ? { thinkingLevel: "LOW" } : { thinkingBudget: 0 };

async function generateStreamWithRetry(ai, request) {
  const models = [process.env.GEMINI_MODEL || "gemini-2.5-flash"];
  if (process.env.GEMINI_FALLBACK_MODEL) models.push(process.env.GEMINI_FALLBACK_MODEL);

  let lastError;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const stream = await ai.models.generateContentStream({
          ...request,
          model,
          config: { ...request.config, thinkingConfig: thinkingFor(model) }
        });
        const iterator = stream[Symbol.asyncIterator]();
        const firstChunk = await iterator.next();
        return { iterator, firstChunk };
      } catch (err) {
        lastError = err;
        if (!isBusy(err)) throw err; // only retry "busy" errors
        await sleep(800 * 2 ** attempt); // waits 0.8s, 1.6s, 3.2s
      }
    }
  }
  throw lastError;
}

app.post("/api/chef/chat", aiLimiter, async (req, res) => {
  const { message, ingredients = [], preferences = {} } = req.body || {};
  if (typeof message !== "string" || !message.trim() || message.length > 2000) {
    return res.status(400).json({ error: "Enter a message of up to 2,000 characters." });
  }
  if (!Array.isArray(ingredients) || ingredients.length > 100) {
    return res.status(400).json({ error: "Please send no more than 100 ingredients." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: "The AI service is not configured yet. Add GEMINI_API_KEY to your .env file and restart the server." });
  }

  const safeIngredients = ingredients
    .filter(x => typeof x === "string")
    .map(x => x.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 100);

  const availableRecipes = recipeQuery.all().map(r => ({
    title: r.title,
    cuisine: r.cuisine,
    ingredients: (r.ingredients || "").split(",").filter(Boolean),
    staples: (r.staples || "").split(",").filter(Boolean),
    minutes: r.prep_minutes + r.cook_minutes
  }));

  const preferenceText = [
    preferences.diet ? `Dietary preference: ${String(preferences.diet).slice(0, 100)}` : "",
    preferences.budget ? `Budget: ${String(preferences.budget).slice(0, 100)}` : "",
    preferences.time ? `Time limit: ${String(preferences.time).slice(0, 50)}` : ""
  ].filter(Boolean).join("\n");

  const systemInstruction = `
You are Pantry Match's practical, friendly AI Chef.
Help users plan meals using the ingredients they actually have.
Prioritize recipes in the supplied recipe catalogue when relevant, but you may suggest a sensible new recipe.
Be clear about ingredients they are missing, approximate quantities, preparation time, servings and numbered cooking steps.
Never claim an ingredient is available unless it appears in the user's pantry list.
Ask a short clarification if a key detail such as allergy information is essential.
Do not invent nutritional or medical claims. For food safety, advise users to cook meat thoroughly and avoid cross-contamination.
Keep answers concise, useful and easy for a home cook to follow.
If the user mentions an allergy, take it seriously and do not recommend the allergen.
`;

  const prompt = `
USER PANTRY INGREDIENTS:
${safeIngredients.length ? safeIngredients.join(", ") : "No pantry list supplied."}

USER PREFERENCES:
${preferenceText || "None supplied."}

RECIPE CATALOGUE:
${JSON.stringify(availableRecipes)}

USER MESSAGE:
${message.trim()}
`;

  try {
    const history = db.prepare(`
      SELECT role, message FROM chat_messages
      WHERE user_id='demo-user'
      ORDER BY id DESC LIMIT 12
    `).all().reverse();

    const conversationContext = history.map(row =>
      `${row.role === "assistant" ? "AI CHEF" : "USER"}: ${row.message}`
    ).join("\n");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { iterator, firstChunk } = await generateStreamWithRetry(ai, {
      contents: `${prompt}\n\nRECENT CONVERSATION:\n${conversationContext || "No previous messages."}`,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 900
      }
    });

    res.status(200);
    res.set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.flushHeaders();

    let answer = "";
    const sendChunk = (chunk) => {
      const text = chunk?.text || "";
      if (!text) return;
      answer += text;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    };

    if (!firstChunk.done) sendChunk(firstChunk.value);
    while (true) {
      const next = await iterator.next();
      if (next.done) break;
      sendChunk(next.value);
    }

    answer = answer.trim();
    if (!answer) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "The AI returned an empty response. Please try again." })}\n\n`);
      return res.end();
    }

    const insertMessage = db.prepare("INSERT INTO chat_messages(user_id,role,message) VALUES (?,?,?)");
    insertMessage.run("demo-user", "user", message.trim());
    insertMessage.run("demo-user", "assistant", answer);
    res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    const status = Number(error?.status || error?.response?.status || 0);
    console.error("Gemini request failed:", {
      status: status || undefined,
      code: error?.code,
      message: error?.message || String(error)
    });

    if (status === 401) {
      return res.status(503).json({ error: "Gemini rejected GEMINI_API_KEY. Set a valid Google AI Studio Gemini API key in .env, then restart npm start." });
    }
    if (status === 403) {
      return res.status(503).json({ error: "Gemini denied access. Check that the key is a Google AI Studio key and that its API restrictions allow Gemini." });
    }
    if (status === 404) {
      return res.status(502).json({ error: "The configured Gemini model is unavailable. Set GEMINI_MODEL to a model available to your key." });
    }
    if (status === 429) {
      return res.status(503).json({ error: "Gemini rate limit or quota reached. Check the key's quota and try again later." });
    }
    if (isBusy(error)) {
      return res.status(503).json({ error: "The AI Chef is very busy right now. Please try again in a minute." });
    }

    if (res.headersSent) {
      if (!res.destroyed) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "The response stream was interrupted. Please try again." })}\n\n`);
        res.end();
      }
      return;
    }
    res.status(502).json({ error: "The AI Chef could not reach Gemini. Check the server's network connection and try again." });
  }
});

app.get("/chef", (_req, res) => res.redirect("/"));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.listen(PORT, () => {
  console.log(`Pantry Match running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.log("AI is disabled until GEMINI_API_KEY is set in .env");
});
