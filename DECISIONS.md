# Decision log

Technical decisions for docSearcher, organized by scope

---

## BACKEND

### Framework: FastAPI
- Context & choice: Python was already required for the LLM/embedding SDKs (google-genai, groq), so picked an async Python framework to match
- Justification: native async I/O for chained calls (embed -> search -> generate), auto OpenAPI docs, Pydantic validation built in
- Alternatives: Flask, Django (both lack native async, more setup for the same result)

### Architecture pattern: layered (api -> services -> db)
- Context & choice: routes stay thin, business logic lives in `services/`, all DB/Supabase calls go through `db/`
- Justification: keeps route handlers readable, makes services testable without spinning up FastAPI
- Alternatives: fat routes with logic inline (faster to write, harder to test and reuse)

### Config: pydantic-settings + .env
- Context & choice: `Settings` class loads from `.env`, validated at startup
- Justification: fails fast if a required key is missing, typed access instead of raw `os.environ`
- Alternatives: plain `os.getenv` calls scattered through the code

### LLM providers: Gemini primary, Groq fallback
- Context & choice: Google Gemini for generation and embeddings, Groq as backup
- Justification: both free at this usage scale, one Google API key covers generation and embeddings, cutting setup to a single account
- Alternatives: OpenAI (paid), single-provider setup with no fallback (less resilient)

### LLM fallback pattern: shared `LLMProvider` interface
- Context & choice: `GeminiProvider` and `GroqProvider` both implement a `generate()` method, tried in order
- Justification: a 503/429 from Gemini auto-retries on Groq instead of failing the request
- Alternatives: hardcoded try/except around Gemini only (no fallback, or duplicated retry logic per call site)

### Embedding size: 768 dimensions
- Context & choice: gemini-embedding-2 truncated to 768 dims via `output_dimensionality`
- Justification: model supports Matryoshka truncation, so 768 keeps most of the retrieval quality at a quarter the storage/index cost of the full 3072
- Alternatives: full 3072 dims (more accurate, slower search, larger table)

### PDF processing: pypdf, chunked text
- Context & choice: 500-word chunks, 50-word overlap, 6-page upload limit
- Justification: chunk size and overlap tuned empirically by testing against real documents until answers looked right; page limit keeps upload/embedding time reasonable
- Alternatives: larger chunks (less precise retrieval), no overlap (context lost at chunk boundaries)

### Auth: Supabase Auth
- Context & choice: registration/login/refresh handled by Supabase's built-in auth, not a custom `users` table + password hashing
- Justification: avoids owning password storage and hashing, session/refresh token logic comes for free
- Alternatives: custom JWT + password hash table (more code to secure and maintain)

### Session storage: httpOnly cookies
- Context & choice: access/refresh tokens set as httpOnly cookies
- Justification: not reachable from JS, so not a target for XSS-based token theft
- Alternatives: tokens in localStorage (simpler to read from JS, but exposed to XSS)

### Backend testing: pytest + pytest-asyncio
- Context & choice: tests in `backend/tests/`, covering API, PDF processing, RAG logic
- Justification: standard choice for an async FastAPI app
- Alternatives: unittest (more boilerplate, no async fixtures out of the box)

---

## DATABASE

### Supabase (Postgres + pgvector + Auth)
- Context & choice: one Supabase project for relational data, vector search, and auth
- Justification: free tier, one service instead of three, less infra to run for a solo project
- Alternatives: self-hosted Postgres + pgvector, dedicated vector DB (Pinecone/Weaviate) plus separate auth

### Similarity search: Postgres RPC (`match_documents`)
- Context & choice: cosine similarity search runs as a SQL function inside Postgres, called via Supabase RPC
- Justification: search happens next to the data, no need to pull all embeddings into the app to compare them
- Alternatives: fetch all embeddings and compute similarity in Python (slow, doesn't scale)

### Similarity thresholds: 3-tier scoring
- Context & choice: score >= 0.75 answered directly, 0.55-0.74 answered with a caveat, < 0.55 declined
- Justification: thresholds tuned empirically; avoids answering confidently from a weak match
- Alternatives: single cutoff (answer or refuse, no middle "low confidence" tier)

### Row-level security: enabled even with a service-role backend
- Context & choice: backend uses the Supabase service-role key and checks ownership in code, but RLS policies are still enabled on `conversations` and `messages`
- Justification: second layer of protection in case the anon/authenticated key is ever used directly instead of the service-role client
- Alternatives: RLS only, no app-level checks (simpler, but relies entirely on policies being correct); or skip RLS since the backend already checks (one layer only)

### Documents table: shared, not per-user
- Context & choice: `documents` has no `user_id`, it's one knowledge base for all users
- Justification: matches the product goal (team knowledge base, not personal documents)
- Alternatives: per-user or per-team document scoping (needed for multi-tenant, not needed here)

---

## FRONTEND

### Framework: Next.js, React, TypeScript
- Context & choice: default frontend stack
- Justification: standard choice, not driven by project-specific requirements
- Alternatives: none seriously considered

### Styling/UI: Tailwind v4 + shadcn (Radix UI primitives)
- Context & choice: Tailwind for styling, shadcn components (copy-pasted, built on Radix) for interactive UI
- Justification: accessible primitives from Radix, full control over component code since shadcn isn't a package dependency
- Alternatives: a packaged component library like MUI or Chakra (faster start, less control, extra bundle weight)

### HTTP client: axios
- Context & choice: axios used for all API calls in `lib/api.ts`
- Justification: response interceptors power the silent token-refresh-on-401 flow, `onUploadProgress` drives the upload progress bar; `fetch` supports neither natively
- Alternatives: native `fetch` (would need manual interceptor and progress logic)

### Session state: cookies for tokens, localStorage for UI state only
- Context & choice: actual tokens stay in httpOnly cookies (backend-set); `localStorage` only stores the user's email to show "logged in" state in the UI
- Justification: keeps the sensitive token out of JS while still letting the UI know who's logged in without an extra request
- Alternatives: call `/auth/me` on load instead of reading localStorage (simpler state, one extra request on every page load)

### Frontend testing: Jest + Testing Library
- Context & choice: tests in `frontend/__tests__/`, covering hooks like `useAuth` and `useChat`
- Justification: standard pairing for a React/Next.js app
- Alternatives: Vitest (similar tradeoffs, Jest chosen for wider ecosystem familiarity)
