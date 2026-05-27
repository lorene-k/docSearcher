from app.services.google_client import get_client
from app.services.embedding import embed_query
from app.db.supabase import search_similar_chunks
from app.constants import GENERATION_MODEL, MAX_OUTPUT_TOKENS


def build_prompt(query: str, chunks: list[dict]) -> str:
    context = ""
    for i, chunk in enumerate(chunks):
        context += (
            f"Extrait {i+1} (source: {chunk['filename']}) :\n{chunk['chunk_text']}\n\n"
        )
    return f"""Tu es un assistant interne. Réponds uniquement à partir des extraits suivants.
Si la réponse n'est pas dans les extraits, dis-le clairement.

{context}
Question : {query}"""


def handle_rag(query: str):
    query_embedding = embed_query(query)
    similar_chunks = search_similar_chunks(query_embedding)
    prompt = build_prompt(query, similar_chunks)
    return prompt, similar_chunks


def get_answer(query: str) -> str:
    _client = get_client()
    prompt, similar_chunks = handle_rag(query)
    response = _client.models.generate_content(
        model=GENERATION_MODEL,
        contents=prompt,
        config={"max_output_tokens": MAX_OUTPUT_TOKENS},
    )
    return {
        "answer": response.text,
        "sources": [
            {"filename": c["filename"], "chunk_text": c["chunk_text"]}
            for c in similar_chunks
        ],
    }
