const pantryForm = document.getElementById("pantry-form");
const pantryInput = document.getElementById("pantry-input");
const pantryChips = document.getElementById("pantry-chips");
const ingredientCount = document.getElementById("ingredient-count");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const messagesEl = document.getElementById("chat-messages");
const statusEl = document.getElementById("chef-status");

const PANTRY_KEY = "pantry-match-chef-pantry";
const CHAT_KEY = "pantry-match-chef-chat";
const PREFERENCES_KEY = "pantry-match-chef-preferences";

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

let pantry = readStoredList(PANTRY_KEY)
  .filter((item) => typeof item === "string" && item.trim())
  .map((item) => item.trim())
  .slice(0, 30);
let history = readStoredList(CHAT_KEY)
  .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
  .slice(-20);
let isSending = false;

try {
  const savedPreferences = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
  for (const [name, id] of [["diet", "diet"], ["budget", "budget"], ["cookingTime", "time"]]) {
    const select = document.getElementById(id);
    const value = savedPreferences[name];
    if (typeof value === "string" && [...select.options].some((option) => option.value === value)) {
      select.value = value;
    }
  }
} catch {
  localStorage.removeItem(PREFERENCES_KEY);
}

function savePreferences() {
  const preferences = {
    diet: document.getElementById("diet").value,
    budget: document.getElementById("budget").value,
    cookingTime: document.getElementById("time").value,
  };
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    statusEl.textContent = "Browser storage is unavailable; your preferences will not be saved.";
  }
}

function saveState() {
  try {
    localStorage.setItem(PANTRY_KEY, JSON.stringify(pantry));
    localStorage.setItem(CHAT_KEY, JSON.stringify(history));
  } catch {
    statusEl.textContent = "Browser storage is unavailable; this session will not be saved.";
  }
}

function renderPantry() {
  if (!pantryChips) return;
  pantryChips.replaceChildren();
  pantry.forEach((ingredient, index) => {
    const chip = document.createElement("li");
    chip.className = "chip";
    const label = document.createElement("span");
    label.textContent = ingredient;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.index = String(index);
    remove.setAttribute("aria-label", `Remove ${ingredient}`);
    remove.textContent = "×";
    chip.append(label, remove);
    pantryChips.append(chip);
  });
  ingredientCount.textContent = String(pantry.length);
}

function appendMessage(role, content, persist = true) {
  const article = document.createElement("article");
  article.className = `message message--${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "assistant" ? "👩🏽‍🍳" : "You";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  article.append(avatar, bubble);
  messagesEl.append(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  if (persist) {
    history.push({ role, content });
    history = history.slice(-20);
    saveState();
  }
  return bubble;
}

function addWelcomeMessage() {
  const article = document.createElement("article");
  article.className = "message message--assistant";
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = "👩🏽‍🍳";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const greeting = document.createElement("strong");
  greeting.textContent = "Karibu! Welcome to your kitchen.";
  const tip = document.createElement("p");
  tip.textContent = "Tell me what ingredients you have and I'll suggest meals, explain recipes, or help you use leftovers.";
  bubble.append(greeting, tip);
  article.append(avatar, bubble);
  messagesEl.append(article);
}

function addIngredients(raw) {
  const known = new Set(pantry.map((item) => item.toLocaleLowerCase()));
  for (const part of raw.split(/[\n,]/)) {
    const ingredient = part.trim();
    const key = ingredient.toLocaleLowerCase();
    if (ingredient && ingredient.length <= 60 && !known.has(key) && pantry.length < 30) {
      pantry.push(ingredient);
      known.add(key);
    }
  }
  renderPantry();
  saveState();
}

async function sendMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message || isSending) return;

  const conversation = history.slice(-6);
  appendMessage("user", message);
  chatInput.value = "";
  isSending = true;
  sendButton.disabled = true;
  chatInput.disabled = true;
  statusEl.textContent = "Thinking...";

  const preferences = {
    diet: document.getElementById("diet").value,
    budget: document.getElementById("budget").value,
    cookingTime: document.getElementById("time").value,
  };

  try {
const response = await fetch("/api/chef/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message,
    ingredients: pantry,
    preferences: {
      diet: preferences.diet,
      budget: preferences.budget,
      time: preferences.cookingTime,
    },
  }),
});

    if (!response.ok) {
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      throw new Error(data.error || data.detail || `The Chef returned an error (${response.status}).`);
}

    if (!response.body) throw new Error("Streaming is not supported by this browser.");

    const assistantBubble = appendMessage("assistant", "", false);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    const handleEvent = (block) => {
      let eventName = "message";
      const dataLines = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      if (!dataLines.length) return;

      const data = JSON.parse(dataLines.join("\n"));
      if (eventName === "error" || data.error) throw new Error(data.error || "The response stream was interrupted.");
      if (data.text) {
        answer += data.text;
        assistantBubble.textContent = answer;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      blocks.forEach(handleEvent);
      if (done) break;
    }

    if (buffer.trim()) handleEvent(buffer);
    if (!answer.trim()) throw new Error("The Chef sent an empty reply. Please try again.");

    history.push({ role: "assistant", content: answer.trim() });
    history = history.slice(-20);
    saveState();
    statusEl.textContent = "Ready to help";
  } catch (error) {
    appendMessage("assistant", error.message || "Couldn't reach the Chef. Please try again.");
    statusEl.textContent = "Needs attention";
  } finally {
    isSending = false;
    sendButton.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

pantryForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  addIngredients(pantryInput.value);
  pantryInput.value = "";
  pantryInput.focus();
});

pantryChips?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button) return;
  pantry.splice(Number(button.dataset.index), 1);
  renderPantry();
  saveState();
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(chatInput.value);
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});

document.querySelectorAll("#diet, #budget, #time").forEach((select) => {
  select.addEventListener("change", savePreferences);
});

document.getElementById("clear-chat")?.addEventListener("click", () => {
  history = [];
  try {
    localStorage.removeItem(CHAT_KEY);
  } catch {
    statusEl.textContent = "Browser storage is unavailable.";
  }
  messagesEl.replaceChildren();
  addWelcomeMessage();
  statusEl.textContent = "Ready to help";
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
renderPantry();
history.forEach((message) => appendMessage(message.role, message.content, false));

window.addEventListener("pantry-match:updated", (event) => {
  pantry = event.detail;
  renderPantry();
  saveState();
});
