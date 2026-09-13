# docSearcher

An internal knowledge base with RAG (Retrieval-Augmented Generation).

Upload documents, ask questions in natural language, and get sourced answers.

## Tech Stack

- **Backend:** FastAPI, Python 3.14
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Database & vector store:** Supabase (Postgres + pgvector)
- **Auth:** Supabase Auth, httpOnly cookies
- **LLM:** Google Gemini 2.5 Flash (primary), Groq Llama 3.3 70B (fallback)
- **Embeddings:** Google gemini-embedding-2 (768 dimensions)

## Key features

- **Tiered similarity scoring** : matches above 0.75 are answered directly, matches between 0.55 and 0.75 are answered with a caveat, and anything below 0.55 is declined rather than risking a hallucinated answer
- **LLM fallback abstraction** : Gemini and Groq sit behind a common `LLMProvider` interface, so a failed or rate-limited call to one provider automatically retries on the other
- **Persistent conversations** : chat history is stored in Supabase and the last few messages are replayed into the prompt, so the assistant keeps context across turns
- **Cookie-based auth with silent refresh** : access and refresh tokens live in httpOnly cookies; an axios interceptor catches 401s and transparently refreshes the session before retrying the failed request
- **Defense-in-depth on row-level security** : the backend uses a service-role key and enforces ownership in application code, but RLS policies are still enabled on `conversations` and `messages` as a second layer

## Prerequisites

- Python 3.14
- Node.js 20+
- A Supabase project with the `pgvector` extension enabled and email confirmation disabled for sign-up
- A Google AI Studio API key
- A Groq API key (optional, only needed for LLM fallback)

## Installation

**Database**

Apply the migrations in `backend/supabase/migrations/` to your Supabase project (via the SQL editor or the Supabase CLI). This creates the `documents`, `conversations`, and `messages` tables, the `match_documents` RPC used for similarity search, and the RLS policies.

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Frontend**

```bash
cd frontend
npm install
```

## Configuration

Copy `backend/.env.example` to `backend/.env` and fill in your Supabase and API keys.

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Usage

Run both servers at once:

```bash
make dev
```

Or start them separately:

**Backend**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm run dev
```
