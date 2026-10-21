# CYAN — Neon AI Companion

A responsive React + TypeScript + Vite website with a cyan-neon orb robot, expressive eye states, chat UI, browser speech output, optional speech recognition, and a Cloudflare Pages Function for AI chat.

## Requirements

- Node.js 20 or newer recommended
- An AI API key for real model responses (the site has a small demo fallback without a key)

## Run locally

```bash
npm install
npm run dev
```

The UI will run locally. Without a deployed Pages Function, `/api/chat` won't be available through the Vite dev server. To test the backend locally with Cloudflare Pages, use Wrangler:

```bash
npm install -D wrangler
npx wrangler pages dev dist
```

Build first with `npm run build`. For a local AI test, set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` in the environment used by Wrangler, or add a local `.dev.vars` file (do not commit it):

```dotenv
AI_API_KEY=your_secret_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

The default base URL and model are already configured in the function, so normally only `AI_API_KEY` is required for an OpenAI-compatible endpoint.

## Deploy to Cloudflare Pages

### Option A: Git integration

1. Push this project to a Git repository.
2. In Cloudflare Dashboard, open **Workers & Pages** → **Create** → **Pages** → connect your repository.
3. Set build command to `npm run build`.
4. Set build output directory to `dist`.
5. In the Pages project's **Settings → Variables and Secrets**, add `AI_API_KEY` as a **secret**. Optional plain-text variables: `AI_BASE_URL` and `AI_MODEL`.
6. Deploy/redeploy the project.

### Option B: Direct upload

Cloudflare Pages Direct Upload deployments of prebuilt static files may not upload the `functions/` source as a working Pages Function. For this project, prefer Git integration or deploy using Wrangler with the source project so the `/api/chat` Function is included.

## Environment variables

- `AI_API_KEY` — secret API key. Required for real AI replies; absent means demo replies.
- `AI_BASE_URL` — optional OpenAI-compatible API base URL, default `https://api.openai.com/v1`.
- `AI_MODEL` — optional model name, default `gpt-4o-mini`.

The API route is `POST /api/chat` and expects JSON such as:

```json
{"message":"Ê CYAN, hôm nay thế nào?","style":"genz","history":[]}
```

## Voice and privacy notes

- Voice output uses the browser's `speechSynthesis`; available Vietnamese voices vary by device/browser.
- Speech recognition uses `SpeechRecognition` / `webkitSpeechRecognition` where supported, commonly in Chromium-based browsers. Microphone permission is required.
- The current code does not persist conversations in a database. Messages are held in page memory and disappear on refresh. If an external AI provider is configured, chat content is sent to that provider to generate a response; disclose this clearly in a production privacy notice.
- Add rate limiting, authentication or abuse controls before exposing a public production endpoint to significant traffic. Never put `AI_API_KEY` in frontend variables or source code.
- The emotion state is an expressive UI choice inferred from text/provider output, not a claim that the AI experiences feelings.
