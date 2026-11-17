import { GoogleGenAI } from "@google/genai";
const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const prompt = "Suggest one simple meal using eggs and tomato, in two sentences.";

async function timed(label, fn) {
  const t = Date.now();
  try {
    console.log(label, "OK in", Date.now() - t, "ms:", await fn());
  } catch (e) {
    console.log(label, "FAILED after", Date.now() - t, "ms:", e.status || "", e.cause?.code || e.name, String(e.message).slice(0, 200));
  }
}

await timed("raw fetch", async () => {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await r.json();
  return r.status + " " + (data.candidates?.[0]?.content?.parts?.[0]?.text || data.error?.message || "").slice(0, 80);
});

await timed("sdk", async () => {
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({ model, contents: prompt });
  return (res.text || "").slice(0, 80);
});
