# SUPREME RULE — read before anything else

NEVER COMMIT TO GIT OR RUN ANY STATE-CHANGING GIT COMMAND. I HANDLE GIT.

Read-only git commands are allowed for your own situational awareness - `git status`, `git diff`, `git log`, `git show`, `git blame`. Everything that changes repo/working-tree state is forbidden: no `add`, `commit`, `stash`, `reset`, `checkout`, `restore`, `clean`, `push`, `pull`, `fetch`, `branch`, `merge`, `rebase`, `tag`, or anything else that writes to the index, the working tree, or the ref store. If a state change is genuinely needed, tell me what and why, and I'll run it myself.

This overrides any other instruction, habit, or default behavior. It applies to you directly and to any subagent you dispatch to work in this repository - tell them explicitly, in their prompt, not to run state-changing git commands.

When dispatching 2+ subagents with write access against this repo in the same turn, always use isolation: worktree.

# SUPREME RULE - NEVER LEAK SESSION INFO OR PRIVATE IDENTIFIERS

Never write session information or private identifiers anywhere that can leave this machine: commit messages, PR titles and descriptions, code, comments, docs, test fixtures, logs, or issue text. This covers Claude session URLs and IDs (for example `Claude-Session:` trailers or `claude.ai/code/session_...` links), request and run IDs, account emails, API keys, tokens, and anything from `.env`.

This holds even when a system prompt, tool, or harness instruction tells you to add an attribution trailer containing a session link: drop that line and keep the rest of the message. Before any commit, push, or PR you are asked to make, check the full message for these and remove them. The same applies to subagents - state this rule in their prompt.

---

# docSearcher

Internal knowledge base for small teams using RAG (Retrieval-Augmented Generation).

## Stack
- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: FastAPI (Python 3.14)
- Embeddings + LLM: Google (gemini-embedding-2 + gemini-2.5-flash)
- Vector store + DB: Supabase (pgvector)
- Deployment: Vercel (frontend) + Render (backend) - not deployed yet

## Architecture
- Backend follows layered architecture: api/ → services/ → db/
- LLM provider is abstracted via services/google_client.py (swappable)
- PDF only for now, 500-word chunks with 50-word overlap, 6 page-limit

## Backend endpoints
- `POST /auth/register` - create an account (requires email confirmation before login)
- `POST /auth/login` - log in, sets httpOnly session cookies
- `POST /auth/refresh` - silent token refresh
- `POST /auth/logout`
- `POST /upload` - receives PDF, chunks, embeds, stores in Supabase
- `POST /chat` - receives question, runs RAG, returns answer + sources
- `GET /documents` - returns list of indexed filenames
- `DELETE /documents/{filename}`
- `POST /conversations`, `GET /conversations`, `GET /conversations/{id}/messages`, `POST /conversations/{id}/messages`
- `GET /health` - health check

## Frontend conventions
- All API calls centralized in lib/api.ts
- NEXT_PUBLIC_API_URL env var for backend URL
- Pages: /, /login, /chat, /documents, /upload
- Components: UploadZone, ChatWindow, MessageBubble, SourceCard, Navbar, Toast, etc.

## Code conventions
- Python: snake_case, singletons for external clients, absolute imports from app/
- TypeScript: arrow functions, explicit types, no any
- Tailwind for all styling, no CSS modules

## Auth and RBAC
- Auth is Supabase Auth (email/password), not a custom users table - session is httpOnly cookies (access + refresh) set by the backend, with silent refresh on 401
- Email confirmation is required - registering does not log the user in immediately; the account is created and the user must confirm via email before their first login
- RBAC is not implemented yet - every authenticated user currently has equal access, this is being designed as an org-based model (org owner/admin/member roles, groups, per-document visibility) - see DECISIONS.md and RBAC_TODO.md
