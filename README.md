# docSearcher

Internal knowledge base for small teams. Upload PDF documents and query them via a chat interface powered by RAG (Retrieval-Augmented Generation).

## Features

- Upload and index PDF documents
- Chat interface to query the knowledge base
- Answers include sources (filename + relevant passage)
- List of indexed documents

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python 3.11) |
| Embeddings + LLM | Google text-embedding-004 + Gemini Flash |
| Vector store + DB | Supabase (pgvector) |
| Frontend deployment | Vercel |
| Backend deployment | Render |

## Requirements

- Python 3.11
- Node.js 18+

## Getting started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your API keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # fill in backend URL
npm run dev
```

## Environment variables

### Backend `.env`

```
GOOGLE_AI_KEY=
SUPABASE_URL=
SUPABASE_PUBLIC_KEY=
```

### Frontend `.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Known limitations

- No authentication - all users share the same document base (planned for v1.2)
- PDF only (DOCX and TXT planned for v1.1)
- Render free tier: backend may have ~30s cold start after inactivity
- Google API: embedding AI pdf processing limited to 6 pages


## Roadmap

- v1.1 - Multi-format support (DOCX, TXT) + Google Drive sync
- v1.2 - User authentication + per-team document isolation (Supabase RLS)
- v1.3 - On-premise LLM support via Ollama
- v2.0 - Training modules + quizzes generated from documents

> Note: in the current MVP, document content is sent to Google's API for embedding and generation. For production use with sensitive data, the LLM provider can be swapped for a local Ollama instance.