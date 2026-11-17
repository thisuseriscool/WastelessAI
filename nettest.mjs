fetch("https://generativelanguage.googleapis.com/v1beta/models", {
  headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
})
  .then((r) => console.log("status", r.status))
  .catch((e) => console.log("failed:", e.cause?.code || e.message));
