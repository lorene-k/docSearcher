from google.genai import types
from app.constants import EMBEDDING_MODEL
from app.services.google_client import get_client

def embed_chunks(chunks: list[str]) -> list[list[float]]:
    embeddings = []
    client = get_client()
    for chunk in chunks:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=chunk,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT", output_dimensionality=768
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
            task_type="RETRIEVAL_QUERY", output_dimensionality=768
        ),
    )
    return result.embeddings[0].values
