from app.config import settings
from app.constants import MATCH_CANDIDATES, SIMILARITY_LOW
from supabase import Client, create_client

_client: Client | None = None
_auth_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        # Service role key: the backend enforces auth itself (verified Supabase
        # sessions + ownership checks), so it talks to Postgres as a trusted
        # server, bypassing RLS. RLS policies exist as defense-in-depth against
        # any direct anon/authenticated access, not this client.
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


def get_auth_client() -> Client:
    global _auth_client
    if _auth_client is None:
        # Anon key: Supabase Auth calls (sign up/in, refresh, verify) run as the
        # anon role, per Supabase's convention for auth flows.
        _auth_client = create_client(settings.supabase_url, settings.supabase_public_key)
    return _auth_client


# ── documents ─────────────────────────────────────────────────────────────────


def insert_chunks(filename: str, chunks: list[dict]) -> None:
    client = get_client()
    client.table("documents").insert(chunks).execute()


def search_similar_chunks(query_embedding: list[float], match_count: int = MATCH_CANDIDATES) -> list[dict]:
    client = get_client()
    result = client.rpc(
        "match_documents",
        {"query_embedding": query_embedding, "match_count": match_count},
    ).execute()
    return [chunk for chunk in result.data if chunk["similarity"] >= SIMILARITY_LOW]


def get_filenames() -> list[str]:
    client = get_client()
    result = client.table("documents").select("filename").execute()
    return list({row["filename"] for row in result.data})


def delete_document(filename: str) -> bool:
    client = get_client()
    result = client.table("documents").delete().eq("filename", filename).execute()
    return bool(result.data)


# ── conversations ──────────────────────────────────────────────────────────────


def create_conversation(user_id: str) -> dict:
    client = get_client()
    result = client.table("conversations").insert({"user_id": user_id}).execute()
    return result.data[0]


def get_conversation(conversation_id: str) -> dict | None:
    client = get_client()
    result = client.table("conversations").select("*").eq("id", conversation_id).execute()
    return result.data[0] if result.data else None


def get_conversations(user_id: str) -> list[dict]:
    client = get_client()
    result = client.table("conversations").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data


# ── messages ───────────────────────────────────────────────────────────────────


def get_messages(conversation_id: str) -> list[dict]:
    client = get_client()
    result = (
        client.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


def insert_message(conversation_id: str, role: str, text: str, sources: list[dict] | None = None) -> dict:
    client = get_client()
    result = (
        client.table("messages")
        .insert({"conversation_id": conversation_id, "role": role, "text": text, "sources": sources or []})
        .execute()
    )
    return result.data[0]
