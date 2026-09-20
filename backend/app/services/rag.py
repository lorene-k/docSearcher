import logging

from fastapi import HTTPException, status

from app.constants import SIMILARITY_HIGH
from app.db.supabase import get_conversation, get_messages, insert_exchange, search_similar_chunks
from app.services.embedding import embed_query
from app.services.llm import generate_with_fallback

logger = logging.getLogger(__name__)

HISTORY_WINDOW = 5
NO_MATCH_ANSWER = "Sorry, I couldn't find any relevant information in the available documents."

PROMPT_RULES = """You are an internal assistant. Answer only from the excerpts below.
Rules:
- If the question is too vague, ask for clarification before answering.
- If the answer is not in the excerpts, say so clearly without making anything up.
- Always cite the source (filename) of the excerpt you used.
- Answer in English."""


def format_excerpts(chunks: list[dict]) -> str:
    return "\n\n".join(
        f"Excerpt {i} (source: {chunk['filename']}):\n{chunk['chunk_text']}" for i, chunk in enumerate(chunks, 1)
    )


def format_history(messages: list[dict]) -> str:
    lines = [f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['text']}" for m in messages[-HISTORY_WINDOW:]]
    return "Recent history:\n" + "\n".join(lines)


def build_prompt(query: str, chunks_high: list[dict], chunks_low: list[dict], history: list[dict] | None = None) -> str:
    sections = [PROMPT_RULES]
    if history:
        sections.append(format_history(history))
    if chunks_high:
        sections.append("Relevant excerpts (prefer these):\n" + format_excerpts(chunks_high))
    else:
        sections.append("Start your answer by saying you found no direct match, but that the following may be related.")
    if chunks_low:
        sections.append("Less relevant excerpts (optional, use with caution):\n" + format_excerpts(chunks_low))
    sections.append(f"Question: {query}")
    return "\n\n".join(sections)


def retrieve_chunks(query: str) -> tuple[list[dict], list[dict]]:
    """Return the matching chunks split into high and low relevance."""
    chunks = search_similar_chunks(embed_query(query))
    chunks_high = [c for c in chunks if c["similarity"] >= SIMILARITY_HIGH]
    chunks_low = [c for c in chunks if c["similarity"] < SIMILARITY_HIGH]
    return chunks_high, chunks_low


def to_sources(chunks: list[dict], relevance: str) -> list[dict]:
    return [{"filename": c["filename"], "chunk_text": c["chunk_text"], "relevance": relevance} for c in chunks]


def get_answer(query: str, user_id: str, conversation_id: str | None = None) -> dict:
    history: list[dict] = []
    if conversation_id:
        conversation = get_conversation(conversation_id)
        if not conversation or conversation["user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        history = get_messages(conversation_id)

    chunks_high, chunks_low = retrieve_chunks(query)
    if not chunks_high and not chunks_low:
        answer, sources = NO_MATCH_ANSWER, []
    else:
        try:
            answer = generate_with_fallback(build_prompt(query, chunks_high, chunks_low, history))
        except RuntimeError as exc:
            logger.exception("LLM generation failed for query: %s", query)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The assistant is temporarily unavailable. Please try again shortly.",
            ) from exc
        sources = to_sources(chunks_high, "high") + to_sources(chunks_low, "low")

    if conversation_id:
        insert_exchange(conversation_id, query, answer, sources)

    return {"answer": answer, "sources": sources}
