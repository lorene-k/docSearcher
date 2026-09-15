import logging

from fastapi import HTTPException, status

from app.services.embedding import embed_query
from app.db.supabase import get_conversation, search_similar_chunks, get_messages, insert_message
from app.services.llm import generate_with_fallback
from app.constants import SIMILARITY_HIGH, SIMILARITY_LOW

logger = logging.getLogger(__name__)

HISTORY_WINDOW = 5


def get_context(chunks_high: list[dict], chunks_low: list[dict]) -> tuple[str, str]:
    context_high = ""
    context_low = ""
    for i, chunk in enumerate(chunks_high):
        context_high += f"Excerpt {i+1} (source: {chunk['filename']}):\n{chunk['chunk_text']}\n\n"
    for i, chunk in enumerate(chunks_low):
        context_low += f"Excerpt {i+1} (source: {chunk['filename']}):\n{chunk['chunk_text']}\n\n"
    return context_high, context_low


def get_sections(context_high: str, context_low: str) -> tuple[str, str]:
    high_section = (
        f"Relevant excerpts (prefer these):\n    {context_high}"
        if context_high
        else "Start your answer by saying you found no direct match, but that the following may be related\n        "
    )
    low_section = (
        f"\n    Less relevant excerpts (optional, use with caution):\n    {context_low}\n    "
        if context_low
        else ""
    )
    return high_section, low_section


def build_history_section(messages: list[dict]) -> str:
    if not messages:
        return ""
    lines = []
    for msg in messages[-HISTORY_WINDOW:]:
        role_label = "User" if msg["role"] == "user" else "Assistant"
        lines.append(f"{role_label}: {msg['text']}")
    return "\n    Recent history:\n    " + "\n    ".join(lines) + "\n"


def build_prompt(query: str, chunks_high: list[dict], chunks_low: list[dict], history: list[dict] | None = None) -> str:
    context_high, context_low = get_context(chunks_high, chunks_low)
    high_section, low_section = get_sections(context_high, context_low)
    history_section = build_history_section(history or [])

    return f"""You are an internal assistant. Answer only from the excerpts below.
    Rules:
    - If the question is too vague, ask for clarification before answering.
    - If the answer is not in the excerpts, say so clearly without making anything up.
    - Always cite the source (filename) of the excerpt you used.
    - Answer in English.
    {history_section}
    {high_section}

    {low_section}

    Question: {query}"""


def handle_rag(query: str, history: list[dict] | None = None) -> tuple[str | None, list[dict], list[dict]]:
    query_embedding = embed_query(query)
    similar_chunks = search_similar_chunks(query_embedding)
    if not similar_chunks:
        return None, [], []

    chunks_high = [c for c in similar_chunks if c["similarity"] >= SIMILARITY_HIGH]
    chunks_low = [c for c in similar_chunks if SIMILARITY_LOW <= c["similarity"] < SIMILARITY_HIGH]
    prompt = build_prompt(query, chunks_high, chunks_low, history)
    return prompt, chunks_high, chunks_low


def get_answer(query: str, user_id: str, conversation_id: str | None = None) -> dict:
    history: list[dict] = []
    if conversation_id:
        conversation = get_conversation(conversation_id)
        if not conversation or conversation["user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        history = get_messages(conversation_id)

    prompt, chunks_high, chunks_low = handle_rag(query, history)

    if prompt is None:
        answer = "Sorry, I couldn't find any relevant information in the available documents."
        sources: list[dict] = []
    else:
        try:
            answer = generate_with_fallback(prompt)
        except RuntimeError as exc:
            logger.exception("LLM generation failed for query: %s", query)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The assistant is temporarily unavailable. Please try again shortly.",
            ) from exc
        sources = [
            {"filename": c["filename"], "chunk_text": c["chunk_text"], "relevance": "high"}
            for c in chunks_high
        ] + [
            {"filename": c["filename"], "chunk_text": c["chunk_text"], "relevance": "low"}
            for c in chunks_low
        ]

    if conversation_id:
        insert_message(conversation_id, "user", query)
        insert_message(conversation_id, "assistant", answer, sources)

    return {"answer": answer, "sources": sources}
