from google import genai
from google.genai import types
from app.config import settings

client = genai.Client(api_key=settings.google_api_key)

EMBEDDING_MODEL = "text-embedding-004"


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    embeddings = []
    for chunk in chunks:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=chunk,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
        )
        embeddings.append(result.embeddings[0].values)
    return embeddings


def embed_query(query: str) -> list[float]:
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )
    return result.embeddings[0].values
