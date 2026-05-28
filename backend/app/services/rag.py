from app.services.google_client import get_client
from app.services.embedding import embed_query
from app.db.supabase import search_similar_chunks
from app.constants import (
    GENERATION_MODEL,
    MAX_OUTPUT_TOKENS,
    SIMILARITY_HIGH,
    SIMILARITY_LOW,
)


def get_context(chunks_high: list[dict], chunks_low: list[dict]) -> tuple[str, str]:
    context_high = ""
    context_low = ""
    for i, chunk in enumerate(chunks_high):
        context_high += (
            f"Extrait {i+1} (source: {chunk['filename']}) :\n{chunk['chunk_text']}\n\n"
        )
    for i, chunk in enumerate(chunks_low):
        context_low += (
            f"Extrait {i+1} (source: {chunk['filename']}) :\n{chunk['chunk_text']}\n\n"
        )
    return context_high, context_low


def get_sections(context_high: str, context_low: str) -> tuple[str, str]:
    high_section = (
        f"""Extraits pertinents (à privilégier) :
    {context_high}"""
        if context_high
        else """Commence le message par dire que tu n'as pas trouvé de correspondance directe mais voici ce qui pourrait être lié
        """
    )

    low_section = (
        f"""
    Extraits moins pertinents (à utiliser sans obligation et avec prudence) :   
    {context_low}
    """
        if context_low
        else ""
    )
    return high_section, low_section


def build_prompt(query: str, chunks_high: list[dict], chunks_low: list[dict]) -> str:
    context_high, context_low = get_context(chunks_high, chunks_low)
    high_section, low_section = get_sections(context_high, context_low)

    return f"""Tu es un assistant interne. Réponds uniquement à partir des extraits suivants.
    Règles :
    - Si la question est trop vague, demande une précision avant de répondre.
    - Si la réponse n'est pas dans les extraits, dis-le clairement sans inventer.
    - Cite toujours la source (filename) de l'extrait utilisé.
    - Réponds en français.
    
    {high_section}
    
    {low_section}
    
    Question : {query}"""


def handle_rag(query: str):
    query_embedding = embed_query(query)
    similar_chunks = search_similar_chunks(query_embedding)
    if not similar_chunks:
        return None, []

    chunks_high = [c for c in similar_chunks if c["similarity"] >= SIMILARITY_HIGH]
    chunks_low = [
        c for c in similar_chunks if SIMILARITY_LOW <= c["similarity"] < SIMILARITY_HIGH
    ]
    prompt = build_prompt(query, chunks_high, chunks_low)

    return prompt, chunks_high, chunks_low


def get_answer(query: str) -> str:
    _client = get_client()
    prompt, chunks_high, chunks_low = handle_rag(query)
    if prompt is None:
        return {
            "answer": "Désolé, je n'ai trouvé aucune information pertinente dans les documents disponibles.",
            "sources": [],
        }

    response = _client.models.generate_content(
        model=GENERATION_MODEL,
        contents=prompt,
        config={"max_output_tokens": MAX_OUTPUT_TOKENS},
    )

    return {
        "answer": response.text,
        "sources": [
            {
                "filename": c["filename"],
                "chunk_text": c["chunk_text"],
                "relevance": "high",
            }
            for c in chunks_high
        ]
        + [
            {
                "filename": c["filename"],
                "chunk_text": c["chunk_text"],
                "relevance": "low",
            }
            for c in chunks_low
        ],
    }
