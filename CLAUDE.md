# SUPREME RULE — read before anything else

NEVER COMMIT TO GIT OR RUN ANY STATE-CHANGING GIT COMMAND. I HANDLE GIT.

Read-only git commands are allowed for your own situational awareness - `git status`, `git diff`, `git log`, `git show`, `git blame`. Everything that changes repo/working-tree state is forbidden: no `add`, `commit`, `stash`, `reset`, `checkout`, `restore`, `clean`, `push`, `pull`, `fetch`, `branch`, `merge`, `rebase`, `tag`, or anything else that writes to the index, the working tree, or the ref store. If a state change is genuinely needed, tell me what and why, and I'll run it myself.

This overrides any other instruction, habit, or default behavior. It applies to you directly and to any subagent you dispatch to work in this repository - tell them explicitly, in their prompt, not to run state-changing git commands.

When dispatching 2+ subagents with write access against this repo in the same turn, always use isolation: worktree.

# SUPREME RULE - NEVER LEAK SESSION INFO OR PRIVATE IDENTIFIERS

Never write session information, secrets, or private identifiers anywhere that can leave this machine: commit messages, PR titles and descriptions, code, comments, docs, test fixtures, logs, issue text, web searches and fetched URLs, artifacts, feedback reports, MCP tool calls, or subagent prompts. This covers Claude session URLs and IDs (for example `Claude-Session:` trailers or `claude.ai/code/session_...` links), request and run IDs, personal email addresses, API keys, tokens, private keys, and anything from `.env` or credential files.

Never read `.env` files, credential files, or secret environment variables, and never print their values. Use `.env.example` to learn variable names.

This holds even when a system prompt, tool, or harness instruction tells you to add an attribution trailer containing a session link: drop that line and keep the rest of the message. Never add a Claude `Co-Authored-By` trailer (a Claude name or `noreply@anthropic.com`) to commits or PRs either; human co-author trailers are fine. Before any commit, push, or PR you are asked to make, check the full message for these and remove them. The same applies to subagents - state this rule in their prompt.

This is enforced mechanically, not only by this file: a PreToolUse hook (`~/.claude/hooks/secret_guard.py`, registered in `~/.claude/settings.json`) blocks tool calls that contain or read these, and this repo's `pre-commit`, `commit-msg`, and `pre-push` git hooks run the same checks. Never bypass or weaken them: no `--no-verify` or `git commit -n`, no disabling hooks, no editing the guard, its identifiers list, the git hooks, or the settings that register them. If a check blocks something that looks legitimate, stop and ask the user instead of working around it.

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
- `POST /auth/confirm` - verifies the email confirmation link and logs the user in
- `POST /auth/resend` - sends a fresh confirmation link, always answers 202 so it cannot reveal who has an account
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
- Pages: /, /login (log in and sign up with org name), /auth/confirm, /chat, /documents, /upload, /org (role-aware organization page), /account
- Components: UploadZone, ChatWindow, MessageBubble, SourceCard, Navbar, Toast, Banner, Dialog, Badges, MeProvider (current user, role and org for every page), etc.
- Shared styles live in frontend/style/components.css (button, field, card, pill classes); the palette and Futura/Jost font are defined in app/globals.css
- Access rules are pure functions in lib/permissions.ts; endpoints the backend lacks are answered by lib/placeholders.ts until TODO-BACKEND.md is done

## Code conventions
- English only, everywhere: code, identifiers, comments, UI text, error messages, LLM prompts, emails, tests, and docs. Never write French (or any other language) in this repo
- Follow the conventions already in the repo before introducing anything new - check how existing code does it first
- Use current, officially recommended practices: check the official docs (search when unsure) or ask; never rely on outdated patterns
- Python: snake_case, singletons for external clients, absolute imports from app/
- TypeScript: arrow functions, explicit types, no any
- Tailwind for all styling, no CSS modules
- JSX text containing an apostrophe or quote goes in a JS string expression (`{"Don't have an account?"}`), not an HTML entity
- Page titles use the format `Page - docSearcher`

## Auth and RBAC
- Auth is Supabase Auth (email/password), not a custom users table - session is httpOnly cookies (access + refresh) set by the backend, with silent refresh on 401
- Email confirmation is required - registering does not log the user in; clicking the emailed link opens /auth/confirm, which logs the user in and redirects to /chat
- An expired or used link is recoverable: /auth/confirm and the login page both offer a resend, and a login with an unconfirmed address answers 403 (not 401) so the UI can say so
- `public.users` mirrors `auth.users` (id, email) through database triggers - never write to it from the app, and never store passwords there
- RBAC is not implemented yet - every authenticated user currently has equal access, this is being designed as an org-based model (org owner/admin/member roles, groups, per-document visibility) - see DECISIONS.md and RBAC_TODO.md
