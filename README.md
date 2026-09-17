# docSearcher

An internal knowledge base with RAG.

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
- Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), for the local database
- [mkcert](https://github.com/FiloSottile/mkcert) (`brew install mkcert`), for the local HTTPS certificate
- A hosted Supabase project for production
- A Google AI Studio API key
- A Groq API key (optional, only needed for LLM fallback)

## Installation

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

Copy `backend/.env.example` to `backend/.env` and fill in the Supabase URL and keys from `supabase status`, plus your Google and Groq keys. That file is for local development only; in production the same variables are set in the Render dashboard, and Vercel holds `NEXT_PUBLIC_API_URL` for the frontend. The frontend needs no env file locally, since it defaults to `https://localhost:8000`.

## Local HTTPS

Both dev servers run over HTTPS, so the `Secure` session cookies behave exactly as they do in production instead of needing a separate local code path. `make certs` issues a certificate for `localhost` into `certs/` (gitignored) with mkcert, and `mkcert -install` adds its local CA to your system trust store so the browser accepts it without warnings; it asks for your password the first time. The `dev`, `backend` and `frontend` targets depend on the certificate file, so it is created once and reused afterwards. Delete `certs/` to issue a new one.

The frontend then serves on https://localhost:3000 and the backend on https://localhost:8000. The Supabase stack stays on plain http, since only the backend talks to it, never the browser.

## Database: development and production

Development runs against a local Supabase stack in Docker, and production is the hosted Supabase project. Both are built from the same migrations in `backend/supabase/migrations/`, which create the `users`, `documents`, `conversations`, and `messages` tables, the triggers that create and sync a `users` row for every sign-up, the `match_documents` RPC used for similarity search, and the RLS policies. Migrations are the only way the schema changes, so never edit tables by hand in the hosted dashboard.

**Local development**

From `backend/`, start the stack and build the database from the migrations:

```bash
supabase start
supabase db reset
```

`supabase status` prints the local API URL and keys to put in `backend/.env`. The local stack also serves Studio at http://127.0.0.1:54323 and Mailpit at http://127.0.0.1:54324, which catches every email the local Auth server sends, including sign-up confirmations. Its Auth settings (confirmation required, Site URL `https://localhost:3000`, and the confirmation template) come from `backend/supabase/config.toml`, so nothing needs to be set by hand. Stop the stack with `supabase stop`.

To change the schema, create a migration with `supabase migration new <name>`, write the SQL, and apply it locally with `supabase db reset`.

**Production**

Link the CLI to the hosted project once, then push migrations that have not been applied yet:

```bash
supabase link --project-ref <project-ref>
supabase migration list
supabase db push
```

`config.toml` only applies to the local stack, so the hosted Auth settings must be set in the Supabase dashboard:

1. Authentication > Sign In / Providers > Email: keep "Confirm email" enabled
2. Authentication > URL Configuration: set Site URL to the production frontend URL
3. Authentication > Emails > Confirm signup: replace the message body with the contents of `backend/supabase/templates/confirmation.html`

## Usage

Run both servers at once:

```bash
make dev
```

Or start them separately:

```bash
make backend
make frontend
```

Both require the certificate from `make certs`, which they create on first run.
