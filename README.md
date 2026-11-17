# Pantry Match

The website's active backend is Node.js, Express, and SQLite. The Chef endpoint uses Google's Gemini API; the API key stays on the server.

## Run the Node app

Use Node.js 22.5 or newer. Install dependencies, then create the local environment file:

```bash
npm install
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` to a Google AI Studio Gemini API key. Do not use an OpenAI key here, and never put the key in browser code or share it. The default model is `gemini-3.8-flash`; API usage may incur charges.

Start the app from this folder:

```bash
npm start
```

Open http://localhost:3000. Use the Node server rather than Live Server or `python3 backend.py` for the integrated Chef API.

## Chef endpoint

The Chef page sends `POST /api/chef/chat` with JSON containing `message`, `ingredients`, and `preferences` (`diet`, `budget`, and `time`). A successful response is `{ "answer": "..." }`. The service returns a clear setup error if the API key is missing or rejected.

For public deployment, configure `GEMINI_API_KEY` as a server-side environment secret and use a production-grade Node hosting service.