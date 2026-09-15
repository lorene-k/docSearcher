-- Tables backing the RAG flow (documents, conversations, messages). User identity
-- comes from Supabase Auth's auth.users, mirrored in public.users (initial migration).
--
-- The backend talks to Postgres via the service_role key and enforces ownership
-- itself (verified Supabase sessions + app-level ownership checks), so it
-- bypasses RLS by design. RLS is still enabled with real auth.uid()-based
-- policies on conversations/messages as defense-in-depth, in case the anon/
-- authenticated key path is ever used directly. documents has no per-user
-- ownership (shared team knowledge base) and stays deny-all: writes only go
-- through the backend's service-role client.

create extension if not exists vector;

create table public.documents (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    chunk_text text not null,
    embedding vector(768) not null,
    created_at timestamptz not null default now()
);

create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create table public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    text text not null,
    sources jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index on public.documents using ivfflat (embedding vector_cosine_ops);
create index on public.conversations (user_id);
create index on public.messages (conversation_id);

create function public.match_documents(query_embedding vector(768), match_count int)
returns table (id uuid, filename text, chunk_text text, similarity float)
language sql stable
as $$
    select id, filename, chunk_text, 1 - (embedding <=> query_embedding) as similarity
    from public.documents
    order by embedding <=> query_embedding
    limit match_count;
$$;

alter table public.documents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "own conversations" on public.conversations
    for all using (auth.uid() = user_id);

create policy "own messages" on public.messages
    for all using (
        exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id and c.user_id = auth.uid()
        )
    );
