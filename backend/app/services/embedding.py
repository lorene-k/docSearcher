from itertools import batched

from google.genai import types

from app.constants import EMBEDDING_BATCH_SIZE, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL
from app.services.google_client import get_client


def _embed(texts: list[str], task_type: str) -> list[list[float]]:
    result = get_client().models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=EMBEDDING_DIMENSIONS),
    )
    return [embedding.values for embedding in result.embeddings]


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    embeddings: list[list[float]] = []
    for batch in batched(chunks, EMBEDDING_BATCH_SIZE):
        embeddings.extend(_embed(list(batch), "RETRIEVAL_DOCUMENT"))
    return embeddings


def embed_query(query: str) -> list[float]:
    return _embed([query], "RETRIEVAL_QUERY")[0]
