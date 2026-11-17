const key = process.env.GEMINI_API_KEY;
const base = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=50";
const names = [];
let url = base;
while (url) {
  const r = await fetch(url, { headers: { "x-goog-api-key": key } });
  const data = await r.json();
  if (!r.ok) { console.log("error", r.status, data.error?.message); break; }
  for (const m of data.models || []) {
    if ((m.supportedGenerationMethods || []).includes("generateContent")) {
      names.push(m.name.replace("models/", ""));
    }
  }
  url = data.nextPageToken ? `${base}&pageToken=${encodeURIComponent(data.nextPageToken)}` : null;
}
const skip = /live|audio|tts|image|robotics|embedding|transcribe|translate|decision/;
console.log(names.filter((n) => !skip.test(n)).join("\n"));
