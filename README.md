# Personal Website + Resume Assistant

This is a Next.js personal website for Yash Vora with an interactive resume and an LLM-backed chat assistant.

## What The App Does

- Landing page (`/`) with profile intro and interactive navigation.
- Resume page (`/resume`) with structured sections for:
  - About
  - Experience timeline
  - Leadership and involvement
  - Education
  - Skills
  - Ask Me About
- Embedded resume chat panel on the resume page:
  - Sends questions to `/api/chat`
  - Supports quick suggested questions
  - Supports minimize/expand controls
  - Shows a timed nudge popup: `try talking with an LLM trained on my experience!`
- Chat responses are constrained to the resume context and generated through Groq's OpenAI-compatible chat API.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Groq API (server-side via `app/api/chat/route.ts`)
- Optional OCR resume sync via `tesseract.js`

## Project Structure

- `app/page.tsx`: Home/landing page
- `app/resume/page.tsx`: Resume page + chat widget mount
- `app/api/chat/route.ts`: Server route that calls Groq
- `components/Resume.tsx`: Resume rendering UI
- `components/ChatWidget.tsx`: Chat UI behavior and nudge popup
- `lib/resume.ts`: Resume typing + LLM context builder
- `data/resume.json`: Canonical resume content used by UI and chat context
- `scripts/extract-resume.mjs`: OCR + parser to update resume data from `public/resume.png`

## Environment Variables

Create `.env.local`:

```bash
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
# VISION_MODEL=gemini-2.5-flash-lite
# Optional:
# GROQ_MODEL=llama-3.1-8b-instant
# VISION_GUESS_DAILY_LIMIT=30
# VISION_GUESS_MIN_INTERVAL_MS=10000
```

`GROQ_API_KEY` is required for chat. Without it, `/api/chat` returns a server error message.
`GEMINI_API_KEY` is required for the Lab Paint Charades feature (`/api/lab/vision-guess`).
`VISION_GUESS_DAILY_LIMIT` controls how many guesses each client may request per local day.  
`VISION_GUESS_MIN_INTERVAL_MS` enforces a minimum pause between guess requests.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Resume Data Flow

- `data/resume.json` is the primary source for displayed resume content.
- `lib/resume.ts` turns that JSON into a plain-text context block for the LLM.
- `npm run resume:sync` will:
  - OCR `public/resume.png` (if present)
  - Parse key resume sections
  - Update `data/resume.json`
  - Write extracted raw text to `data/resume.raw.txt`
- `npm run build` automatically runs `resume:sync` first (`prebuild` hook).

If `public/resume.png` is missing, sync gracefully skips OCR and still ensures `about` fields are populated.

## API

### `POST /api/chat`

Request body:

```json
{
  "messages": [
    { "role": "user", "content": "Tell me about Yash's Apple internship." }
  ]
}
```

Response body:

```json
{
  "message": "..."
}
```

Behavior:

- Prepends two system messages:
  - instruction prompt (plain-text, concise, resume-only answers)
  - generated resume context from `data/resume.json`
- Forwards to Groq at `https://api.groq.com/openai/v1/chat/completions`

### `POST /api/lab/vision-guess`

Request body:

```json
{
  "imageDataUrl": "data:image/png;base64,iVBORw0..."
}
```

Response body:

```json
{
  "model": "gemini-2.5-flash-lite",
  "guess": "Guess: ... (Confidence: 74%)",
  "usage": {
    "promptTokens": 1120,
    "totalTokens": 1120
  },
  "rateLimit": {
    "limit": 10,
    "remaining": 9,
    "resetAt": "1710000000"
  },
  "localRateLimit": {
    "limit": 30,
    "remaining": 29,
    "resetAt": "2026-02-18T00:00:00.000Z",
    "cooldownMs": 10000
  }
}
```

Behavior:

- Sends the provided image data URL to Google Gemini Vision.
- Returns a charades-style guess plus prompt/total token usage and rate-limit headers.
- Adds local rate-limit guard metadata (`localRateLimit`) to support the in-app guess budget UI.

## NPM Scripts

- `npm run dev`: Start local dev server
- `npm run lint`: Run ESLint
- `npm run resume:sync`: OCR/parse resume into JSON data
- `npm run build`: Run `resume:sync`, then production build
- `npm run start`: Start production server
