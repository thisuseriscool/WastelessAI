const form = document.getElementById("ingredient-form");
const input = document.getElementById("ingredient-input");
const chipsEl = document.getElementById("chips");
const resultsEl = document.getElementById("results-grid") || document.getElementById("results");
const statusEl = document.getElementById("results-status");

let recipes = [];
let items = []; // { label, key }
let activeCategory = "";

// Extra names that should count as the same ingredient
const ALIASES = {
  capsicum: "bell pepper", "green pepper": "bell pepper", "red pepper": "bell pepper",
  "ground beef": "beef", mince: "beef", "chicken breast": "chicken",
  spaghetti: "pasta", macaroni: "pasta", cheddar: "cheese", "garlic clove": "garlic",
};

// "Tomatoes " -> "tomato", "Bell Peppers" -> "bell pepper"
function normalize(text) {
  let s = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (s.endsWith("ies")) s = s.slice(0, -3) + "y";
  else if (s.endsWith("oes")) s = s.slice(0, -2);
  else if (s.endsWith("s") && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);
  return ALIASES[s] || s;
}

try {
  const storedIngredients = JSON.parse(localStorage.getItem("pantry-match-chef-pantry") || "[]");
  if (Array.isArray(storedIngredients)) {
    items = storedIngredients
      .filter((label) => typeof label === "string" && label.trim())
      .map((label) => ({ label: label.trim(), key: normalize(label) }));
  }
} catch {
  items = [];
}

const RECIPE_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82",
];

const PROTEIN_INGREDIENTS = new Set(["egg", "chicken", "beef", "lentil", "chickpea", "cheese"]);
const MEAT_INGREDIENTS = new Set(["chicken", "beef", "fish", "pork", "lamb", "shrimp"]);

function matchesCategory(recipe) {
  const ingredients = recipe.ingredients.map(normalize);
  const title = recipe.title.toLowerCase();
  switch (activeCategory) {
    case "quick": return recipe.time <= 30;
    case "protein": return ingredients.some((ingredient) => PROTEIN_INGREDIENTS.has(ingredient));
    case "comfort": return /curry|pasta|pancake|toast|soup|omelette|grilled cheese/.test(title);
    case "vegetarian": return !ingredients.some((ingredient) => MEAT_INGREDIENTS.has(ingredient));
    case "one-pot": return /one-pot|stir-fry|soup|curry|fried rice/.test(title);
    case "meal-prep": return recipe.servings >= 3 || recipe.time >= 30;
    default: return true;
  }
}

// Builds an element safely (textContent, never innerHTML)
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------- Ingredients ---------- */
function addIngredients(raw) {
  raw.split(",").forEach((part) => {
    const label = part.trim();
    const key = normalize(label);
    if (!key || items.some((i) => i.key === key)) return;
    items.push({ label, key });
  });
  update();
}

function removeIngredient(key) {
  items = items.filter((i) => i.key !== key);
  update();
}

function renderChips() {
  chipsEl.replaceChildren(
    ...items.map((item) => {
      const li = el("li", "chip");
      li.append(el("span", "", item.label));
      const btn = el("button", "", "×");
      btn.type = "button";
      btn.dataset.key = item.key;
      btn.setAttribute("aria-label", `Remove ${item.label}`);
      li.append(btn);
      return li;
    })
  );
}

/* ---------- Matching ---------- */
function scoreRecipes() {
  const have = new Set(items.map((i) => i.key));
  return recipes
    .map((recipe) => {
      const missing = recipe.ingredients.filter((ing) => !have.has(ing));
      const owned = recipe.ingredients.length - missing.length;
      return { recipe, missing, owned, pct: Math.round((owned / recipe.ingredients.length) * 100) };
    })
    .filter((match) => (!items.length || match.owned > 0) && matchesCategory(match.recipe))
    .sort((a, b) => {
      if (document.getElementById("recipe-sort")?.value === "time" || !items.length) {
        return a.recipe.time - b.recipe.time;
      }
      return b.pct - a.pct || a.missing.length - b.missing.length || a.recipe.time - b.recipe.time;
    });
}

function renderCard({ recipe, missing, owned, pct }) {
  const card = el("article", "card" + (pct === 100 ? " is-ready" : ""));
  const photo = el("div", "card__photo");
  const image = el("img", "card__image");
  image.src = RECIPE_IMAGES[recipes.indexOf(recipe) % RECIPE_IMAGES.length];
  image.alt = "";
  image.loading = "lazy";
  image.addEventListener("error", () => {
    photo.classList.add("card__photo--fallback");
    image.remove();
  }, { once: true });
  photo.append(image);

  const head = el("div", "card__head");
  head.append(el("h3", "", recipe.title), el("span", "badge", `${pct}%`));

  const meter = el("div", "meter");
  meter.style.setProperty("--pct", pct + "%");
  meter.setAttribute("role", "img");
  meter.setAttribute("aria-label", `${pct} percent match`);
  meter.append(document.createElement("span"));

  const detail = !items.length
    ? "Add pantry ingredients to see your match score."
    : missing.length
    ? `You have ${owned} of ${recipe.ingredients.length}. Missing: ${missing.join(", ")}`
    : "You have everything you need.";

  const open = el("button", "btn btn--outline", "View recipe");
  open.type = "button";
  open.dataset.id = recipe.id;

  const body = el("div", "card__body");
  body.append(
    head,
    meter,
    el("p", "card__meta", `${recipe.time} min · serves ${recipe.servings}`),
    el("p", "card__missing", detail),
    open
  );
  card.append(photo, body);
  return card;
}

function renderResults() {
  if (!recipes.length) return;

  const matches = scoreRecipes();
  const ready = matches.filter((m) => m.pct === 100).length;
  const partial = matches.length - ready;
  resultsEl.replaceChildren(...matches.map(renderCard));
  statusEl.textContent = !items.length
    ? `${matches.length} recipes to explore. Add ingredients to see pantry match scores.`
    : matches.length
    ? `${ready} ready to cook, ${partial} partial ${partial === 1 ? "match" : "matches"}.`
    : "No dishes match yet. Try adding more ingredients.";
}

function update() {
  renderChips();
  renderResults();
  const labels = items.map((item) => item.label);
  try {
    localStorage.setItem("pantry-match-chef-pantry", JSON.stringify(labels));
  } catch {
    statusEl.textContent = "Browser storage is unavailable; your pantry will not be saved.";
  }
  window.dispatchEvent(new CustomEvent("pantry-match:updated", { detail: labels }));
}

/* ---------- Events ---------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  addIngredients(input.value);
  input.value = "";
  input.focus();
});

chipsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (btn) removeIngredient(btn.dataset.key);
});

document.querySelectorAll("[data-add]").forEach((btn) => {
  btn.addEventListener("click", () => addIngredients(btn.dataset.add));
});

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = activeCategory === button.dataset.category ? "" : button.dataset.category;
    document.querySelectorAll("[data-category]").forEach((option) => {
      option.setAttribute("aria-pressed", String(option.dataset.category === activeCategory));
    });
    renderResults();
  });
});

document.getElementById("recipe-sort")?.addEventListener("change", renderResults);

/* ---------- Recipe pop-up ---------- */
const dialog = document.getElementById("recipe-dialog");
const $ = (id) => document.getElementById(id);

function renderVideo(recipe) {
  const box = $("recipe-video");
  box.replaceChildren();

  if (recipe.videoId) {
    // Embed a specific YouTube video when the recipe has a videoId
    const frame = el("iframe", "video");
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(recipe.videoId)}`;
    frame.title = `${recipe.title} video`;
    frame.loading = "lazy";
    frame.allow = "encrypted-media; picture-in-picture";
    frame.allowFullscreen = true;
    box.append(frame);
  } else {
    // Otherwise link to a YouTube search for this dish
    const link = el("a", "btn btn--outline", "Find a video on YouTube");
    link.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.title + " recipe")}`;
    link.target = "_blank";
    link.rel = "noopener";
    box.append(link);
  }
}

function openRecipe(id) {
  const recipe = recipes.find((r) => r.id === id);
  if (!recipe) return;
  const have = new Set(items.map((i) => i.key));

  $("recipe-title").textContent = recipe.title;
  $("recipe-meta").textContent = `${recipe.time} min · serves ${recipe.servings}`;

  $("recipe-ingredients").replaceChildren(
    ...recipe.ingredients.map((ing) =>
      have.has(ing) ? el("li", "", ing) : el("li", "is-missing", `${ing} (missing)`)
    )
  );

  const staples = $("recipe-staples");
  staples.hidden = !recipe.staples.length;
  staples.textContent = `Pantry staples: ${recipe.staples.join(", ")}`;

  $("recipe-steps").replaceChildren(...recipe.steps.map((step) => el("li", "", step)));
  renderVideo(recipe);

  dialog.querySelector(".modal__body").scrollTop = 0;
  dialog.showModal();
}

resultsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (btn) openRecipe(btn.dataset.id);
});
$("recipe-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close(); // click on the dark backdrop
});


/* ---------- Load recipes ---------- */
async function init() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recipes = data.map((r) => ({ ...r, ingredients: r.ingredients.map(normalize) }));
    update();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Couldn't load the recipes. Run the site from a local server instead of opening the file directly.";
  }
}
init();
