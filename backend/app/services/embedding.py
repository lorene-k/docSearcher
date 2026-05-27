from google import genai
from google.genai import types
from app.config import settings

_client: genai.Client | None = None

EMBEDDING_MODEL = "gemini-embedding-2"


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.google_ai_key)
    return _client


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    embeddings = []
    client = get_client()
    for chunk in chunks:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=chunk,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768
            ),
        )
        embeddings.append(result.embeddings[0].values)
    return embeddings


def embed_query(query: str) -> list[float]:
    client = get_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768
        ),
    )
    return result.embeddings[0].values
