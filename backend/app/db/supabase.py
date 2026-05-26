from supabase import create_client, Client
from app.config import settings

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


def insert_chunks(filename: str, chunks: list[dict]) -> None:
    client = get_client()
    client.table("documents").insert(chunks).execute()


def search_similar_chunks(
    query_embedding: list[float], match_count: int = 5
) -> list[dict]:
    client = get_client()
    result = client.rpc(
        "match_documents",
        {"query_embedding": query_embedding, "match_count": match_count},
    ).execute()
    return result.data


def get_filenames() -> list[str]:
    client = get_client()
    result = client.table("documents").select("filename").execute()
    filenames = list({row["filename"] for row in result.data})
    return filenames
