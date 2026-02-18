# Yash Vora — Personal Website

This repository contains a **Next.js personal website** that highlights Yash’s profile, interactive resume, and a lab experiment where users sketch and get AI-generated guesses.

## Website Functionality

### 1) Home page (`/`)
- Presents a profile landing page with:
  - avatar + headline intro
  - social links (auto-read from resume data)
  - animated interactive visual background and navigation web
- Main navigation routes users to:
  - **Resume** (`/resume`)
  - **Lab** (`/lab`)

### 2) Resume page (`/resume`)
- Displays resume content sourced from `data/resume.json`:
  - About
  - Experience timeline
  - Leadership and involvement timeline
  - Education
- Includes a **Download Resume** action (`/resume.png`).
- Includes a **"Learn more about me" floating terms arena**:
  - moving skill/topic pills (technical skills, business skills, ask-me-about topics)
  - selecting a pill dispatches an event that auto-prompts the chat assistant
- Includes an embedded **resume chat panel** (`ChatWidget`):
  - accepts custom questions
  - has quick suggested questions
  - supports minimize/expand
  - calls `POST /api/chat`

### 3) Lab page (`/lab`) — Paint Charades
- Provides an interactive drawing studio with a canvas and tools:
  - brush, eraser, line, rectangle, circle, select
  - color palette + brush size
  - undo/redo, clear, save
  - region actions (copy, paste, fill, delete)
- Has a **Charades Mode** toggle that constrains advanced tools for gameplay.
- Sends canvas image data to `POST /api/lab/vision-guess` to get an AI guess.
- Surfaces:
  - guess text + confidence
  - token usage metadata
  - provider rate metadata
  - local daily guess budget + cooldown feedback

## API Behavior

### `POST /api/chat`
- Uses the incoming conversation history.
- Prepends system instructions and a generated resume context (`buildResumeContext`).
- Calls Groq’s OpenAI-compatible chat completion endpoint.
- Enforces concise, resume-grounded responses with anti-fabrication guidance and query grounding rules.

### `POST /api/lab/vision-guess`
- Accepts a PNG data URL from the drawing canvas.
- Calls Gemini Vision (`generateContent`) with a charades-style prompt.
- Returns:
  - model name
  - formatted guess text
  - token usage
  - provider rate-limit fields (if available)
  - local rate-limit state (daily quota + cooldown)
- Applies in-memory per-client local guards before provider calls.

## Resume Data Model + Sync

- Canonical resume data lives in `data/resume.json`.
- `lib/resume.ts`:
  - exports typed resume data for UI
  - builds plain-text context for LLM prompts
- `npm run resume:sync` executes `scripts/extract-resume.mjs` to:
  - OCR from `public/resume.png` (if present)
  - parse sections into `data/resume.json`
  - write raw OCR text to `data/resume.raw.txt`
- `prebuild` runs this sync automatically before `next build`.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Groq API (resume chat)
- Google Gemini Vision API (lab guessing)
- Tesseract.js (optional resume OCR sync)

## Environment Variables

Create `.env.local`:

```bash
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
# Optional
# GROQ_MODEL=llama-3.1-8b-instant
# VISION_MODEL=gemini-2.5-flash-lite
# VISION_GUESS_DAILY_LIMIT=30
# VISION_GUESS_MIN_INTERVAL_MS=10000
```

Notes:
- `GROQ_API_KEY` is required for `POST /api/chat`.
- `GEMINI_API_KEY` is required for `POST /api/lab/vision-guess`.
- `VISION_GUESS_DAILY_LIMIT` controls local per-client daily guess quota.
- `VISION_GUESS_MIN_INTERVAL_MS` controls local cooldown between guesses.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` — start dev server
- `npm run lint` — run ESLint
- `npm run resume:sync` — OCR/parse resume into JSON
- `npm run build` — production build (runs resume sync first via `prebuild`)
- `npm run start` — start production server
