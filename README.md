# AI Based Reiterative Tutor

A production-style starter project for an AI tutor that teaches in modules, supports voice and multilingual flows, evaluates learners, and adapts when they struggle.

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn-style UI components
- Backend: FastAPI, SQLAlchemy, JWT auth
- Database: PostgreSQL-ready via `DATABASE_URL` with SQLite fallback for quick local runs
- AI integrations: OpenAI-compatible teaching and evaluation hooks, Google Translate hook, Whisper-compatible transcription hook

## Project structure

```text
ai-based-reiterative-tutor/
  frontend/
  backend/
```

## Local setup

### 1. Backend

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The frontend runs at `http://127.0.0.1:3000`.

## Environment notes

- Set `DATABASE_URL` to a PostgreSQL URL for production usage.
- Set `GEMINI_API_KEY` to enable Gemini-powered module generation and evaluation.
- If `OPENAI_API_KEY`, `GOOGLE_TRANSLATE_API_KEY`, or `ELEVENLABS_API_KEY` are not set, the app uses demo-safe fallback behavior so you can still run the full flow locally.
- The frontend now calls the backend through a same-origin Next.js proxy. Set `BACKEND_API_URL` in `frontend/.env.local` if your FastAPI server is not running on `http://127.0.0.1:8000`.
- This project was verified locally with Python `3.13`. Python `3.14` currently attempts slower source builds for some dependencies on this machine.
- Next.js `14.x` satisfies your requested stack, but `npm audit` still reports an upstream advisory that is only fully fixed in Next `16.x`. Keep that in mind if you later relax the version requirement.
