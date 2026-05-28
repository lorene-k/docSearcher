# docSearcher

Internal knowledge base for small teams using RAG (Retrieval-Augmented Generation).

## Stack
- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: FastAPI (Python 3.11)
- Embeddings + LLM: Google (gemini-embedding-2 + gemini-2.5-flash)
- Vector store + DB: Supabase (pgvector)
- Deployment: Vercel (frontend) + Render (backend)

## Architecture
- Backend follows layered architecture: api/ → services/ → db/
- LLM provider is abstracted via services/google_client.py (swappable)
- PDF only for now, 500-word chunks with 50-word overlap, 6 page-limit

## Backend endpoints
- POST /upload - receives PDF, chunks, embeds, stores in Supabase
- POST /chat - receives question, runs RAG, returns answer + sources
- GET /documents - returns list of indexed filenames
- GET /health - health check

## Frontend conventions
- All API calls centralized in lib/api.ts
- NEXT_PUBLIC_API_URL env var for backend URL
- Three pages: /upload, /chat, /documents
- Components: UploadZone, ChatWindow, MessageBubble, SourceCard, etc...

## Code conventions
- Python: snake_case, singletons for external clients, absolute imports from app/
- TypeScript: arrow functions, explicit types, no any
- No auth in MVP - single shared knowledge base
- Tailwind for all styling, no CSS modules

## Known limitations
- No