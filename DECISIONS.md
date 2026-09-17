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

### Python version: 3.14
- Context & choice: the docs said 3.11 while the venv actually ran 3.14, and `.python-version` was gitignored so nothing enforced either. The backend now targets 3.14, pinned in a committed `backend/.python-version`, the Makefile's venv creation, and Ruff's target version
- Justification: it's the version the whole test suite already runs on, Render's default for new Python services since February 2026, and every dependency in `requirements.txt` ships a prebuilt wheel for it
- Alternatives: 3.11 (only ever present in docs, never what the code ran on); 3.12 (widely supported, but would mean moving off the version everything is already tested on for no concrete gain)

### LLM model IDs re-verified: gemini-embedding-2 + gemini-2.5-flash, unchanged
- Context & choice: the audit couldn't confirm from source alone whether `gemini-embedding-2` and `gemini-2.5-flash` (`backend/app/constants.py`) were still valid, current model IDs, so they were live-checked directly against the Google AI API on 2026-09-13 using the project's real key, rather than trusted from search results
- Justification: both IDs exist and are callable today (`embedContent` and `generateContent` actions confirmed present on each); a live API call is authoritative where docs pages and search results were inconsistent with each other
- Alternatives: none needed - kept as-is. Note: one source flagged `gemini-2.5-flash` as a candidate for future deprecation in favor of newer Gemini 3.x models; not acted on since it's still live and callable today, but worth re-checking periodically (see QUESTIONS.md)

### Registration now requires email confirmation
- Context & choice: previously the backend rejected registration with a 400 whenever Supabase returned no session (which happens when email confirmation is on), telling the developer to disable confirmation. The project owner has now deliberately enabled confirmation (`backend/supabase/config.toml`), so this is the expected outcome of every signup, not an error - `sign_up()` and `POST /auth/register` now return a distinct "confirmation pending" success response instead of raising
- Justification: verified email addresses before granting access, over the previous workaround of disabling confirmation to make signup work end-to-end
- Alternatives: keep confirmation off for frictionless demo signup (rejected - explicitly required)

### Duplicate-upload handling: reject, don't silently replace
- Context & choice: uploading a PDF whose filename already exists in the knowledge base now returns 409 instead of silently doubling the indexed chunks
- Justification: avoids two failure modes - duplicate chunks polluting retrieval, and, if "auto-replace" had been chosen instead, silently deleting another user's already-indexed document with no confirmation step
- Alternatives: auto-replace old chunks on re-upload (rejected for now - it's a shared knowledge base and silent overwrite is a data-loss risk without an ownership/confirmation model; revisit once the RBAC model below is implemented and a real "replace" flow with confirmation can be built)

### Basic application logging added
- Context & choice: a minimal `logging` setup now records unhandled provider/DB failures server-side instead of them vanishing into a bare 500
- Justification: the audit found no logging anywhere in the backend, making production failures undebuggable
- Alternatives: full structured/observability logging (request IDs, log aggregation, etc.) - deferred as out of scope for the project's current size

### Auth cookie expiry set explicitly
- Context & choice: access/refresh cookies now carry an explicit `max_age` instead of defaulting to browser-session-only
- Justification: matches the already-advertised "silent refresh" design - without this, users were logged out on every browser restart regardless of the refresh token's real validity
- Alternatives: none, straightforward correctness fix

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

### Documents table: shared, not per-user (superseded, see RBAC section below)
- Context & choice: `documents` has no `user_id`, it's one knowledge base for all users
- Justification: matches the product goal (team knowledge base, not personal documents)
- Alternatives: per-user or per-team document scoping (needed for multi-tenant, not needed here)
- Status: this decision is now stale - the project owner confirmed it's a leftover from the pre-auth MVP and must be restructured for RBAC (org-scoped, per-document visibility). Kept here for history; superseded by "RBAC data model" below. Not yet migrated - see TODO.md

### All timestamp columns use `timestamptz`
- Context & choice: every existing `created_at` column (`users`, `conversations`, `messages`, `documents`) is already `timestamptz`, not naive `timestamp` - verified directly in `backend/supabase/migrations/*.sql`
- Justification: the project owner asked to confirm this convention while reviewing the schema for RBAC; it's already correctly applied everywhere it exists today
- Alternatives: none needed - no fix required for existing tables; new tables added for RBAC (orgs, org members, groups, group members, document visibility/ownership fields) must keep following this same convention

---

## SECURITY

### Rate limiting added on auth endpoints
- Context & choice: `/auth/login` and `/auth/register` are now rate-limited per IP
- Justification: the audit found no throttling anywhere in the backend, meaning unlimited brute-force/credential-stuffing attempts against login were possible
- Alternatives: rely on an edge/proxy-level limiter instead once actually deployed behind one - worth revisiting at deploy time, not a reason to skip an app-level limit now

### RBAC data model: org-based roles, independent visibility axis (design decided, not yet implemented)
- Context & choice, in full, as specified by the project owner: every user belongs to exactly one org (a solo signup is a one-person org they own); every document lives in exactly one org, no org-less documents.
  - **Role (write power, org-scoped):** member = read-only everywhere, no upload/delete/group actions. admin = can create documents, create groups, delete documents (within visibility rules below), manage group membership. owner = everything admin has, plus changing anyone's role and transferring ownership to an existing admin (which demotes the previous owner to admin) - the org is never left without one. Role changes are owner-only.
  - **Visibility (read exposure, per document, independent of role):** private = only the uploader, no override by anyone including admin/owner. group = uploader plus one specific group in the org. org = everyone in the org. Only admin/owner can set visibility at upload time; it can be promoted later (private -> group -> org) but never demoted. A member can only ever act on their own private documents.
  - **Delete rights follow visibility, not just role:** a private document is deletable only by its own uploader, regardless of their role. A group-visible document is deletable by the group's creator-admin or the org owner. An org-visible document is deletable by any admin or the owner.
  - **Groups:** live inside an org, created by an admin/owner, who becomes that group's group-admin. Membership (add/remove) is managed by the group-admin or the org owner; members cannot self-join or self-leave.
  - **"All documents" page:** must show each user only what's visible to them under this logic (their own private docs, their groups' shared docs, the org's shared docs) - never a literal list of everything in the system.
  - A user holds exactly one org role, plus optionally one group-admin designation per group they personally created.
- Justification: this is the access model the project owner specified directly after the initial audit found no role concept existed anywhere in the codebase (see the answered questions this decision is sourced from)
- Alternatives: a flatter "everyone in the org sees everything" model (rejected - visibility must be per-document); a `user_roles` join table for multiple roles per user (rejected - one role per user is sufficient, except the narrow group-admin case, which is handled separately from the org role)
- Status: design decided, not yet implemented - no migration written, `documents`/`users` tables unchanged so far. See TODO.md for the implementation plan

### Chats stay private per-user regardless of role
- Context & choice: conversations and messages remain scoped to the owning user only - no role, including org owner, grants access to another user's chat history
- Justification: explicit decision from the project owner; already matches current enforcement (`require_owned_conversation` in `backend/app/api/conversations.py`), so nothing changes here once RBAC lands - just confirming it stays true
- Alternatives: none considered - owner access to all chats was explicitly ruled out

### Self-registration stays open; org membership is invite-only
- Context & choice: anyone can self-register and becomes owner of a new one-person org; joining an existing org requires an invite from that org's owner and defaults to the member role
- Justification: explicit decision from the project owner - keeps demo signup frictionless while still gating access to an existing org's data
- Alternatives: invite-only registration entirely (rejected - self-registration must stay open)

### No admin UI/backend for now - a single role-aware "org" page instead
- Context & choice: org/role management (inviting, promoting, demoting, ownership transfer) will be exposed through one "org" page in the frontend that renders different content and actions depending on the viewer's role, not a dedicated admin panel
- Justification: explicit decision from the project owner - matches current project scale, avoids building admin tooling before it's needed
- Alternatives: a separate admin section (deferred, not ruled out for later if the org grows)

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

### Base body text raised to 16px, line-height 1.5
- Context & choice: no base font-size/line-height was set anywhere, and primary reading content (chat messages, document rows) was set to Tailwind's `text-sm`/`text-xs` (14px/12px) with zero use of `text-base` (16px) in the entire codebase - confirmed to match the "text is unreadable" complaint directly
- Justification: 16px/1.5 is a standard readable baseline; secondary/metadata text (timestamps, helper captions) intentionally stays smaller
- Alternatives: only fixing the specific complained-about screens (rejected - the same root cause was present nearly everywhere reading content appears)

### Registration no longer auto-logs the user in; confirming the email does
- Context & choice: `register()` used to save a session and redirect straight to `/chat`. With email confirmation required there is no session at signup, so the UI shows a "check your email" state. Clicking the email link now opens `/auth/confirm`, which logs the user in and lands them on `/chat` with an "Email confirmed" toast
- Justification: the previous flow confirmed the email on Supabase's side but never created an app session, so users landed on the login page with no feedback
- Alternatives: redirect to the login page with a "confirmed, please log in" message (simpler, but an extra step the owner didn't want)

### Email confirmation via token_hash, verified server-side
- Context & choice: the "Confirm signup" email links to `{SiteURL}/auth/confirm?token_hash=...&type=email` (template in `backend/supabase/templates/confirmation.html`). The page posts the token to `POST /auth/confirm`, which calls Supabase `verify_otp` and sets the same httpOnly session cookies as login
- Justification: Supabase's documented server-side flow. Tokens never sit in a URL fragment or in browser JavaScript, and it works when the link is opened on a different device or after a backend restart
- Alternatives: the default PKCE redirect with `?code=` (needs the code verifier stored at signup, which a shared server-side client can't hold per user); implicit flow with tokens in the URL fragment (works, but exposes tokens to the browser and history)

### `public.users` mirrors Supabase Auth, filled by database triggers
- Context & choice: `public.users` holds `id` (the `auth.users` id, `on delete cascade`), `email`, and `created_at`. A trigger on `auth.users` insert creates the row at signup and a second trigger keeps `email` in sync when it changes. RLS is enabled with a read-own-row policy. Defined in the initial migration, which replaces the earlier unused `profiles` table since no migration had been applied anywhere yet
- Justification: Supabase's documented pattern for user data. It runs in the same transaction as account creation and gives app tables (and the planned RBAC model) a row to reference from signup onward
- Alternatives: the previous hand-made `users` table with its own `hashed_password` and random `id` (rejected - Supabase Auth already stores and hashes passwords in `auth.users`, so a second copy only adds leak risk, and the id must match the auth user); inserting from the backend after `sign_up` (not atomic, misses users created outside the API)

### An expired confirmation link is recoverable, without leaking who has an account
- Context & choice: `POST /auth/resend` calls Supabase `resend({type: "signup"})` and always answers 202 with the same body, whether or not the address exists. The expired-link card on `/auth/confirm` asks for the address and offers a new link, and `sign_in` now maps Supabase's `email_not_confirmed` code to 403 instead of folding it into the 401 for bad credentials, so the login page can say what is wrong and offer the same resend. `otp_expiry` moved from 600 to 3600 seconds
- Justification: before this, an expired link was a dead end. Login reported "Invalid email or password" for an account that existed with the right password, and registering again could not be relied on to resend, so the address was unusable
- Alternatives: telling the user outright that an address is unconfirmed before any password check (rejected - lets a stranger enumerate accounts; the 403 only appears once the password is correct); leaving recovery to a support request (not acceptable for self-serve signup)
