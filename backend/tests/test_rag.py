"""Tests for RAG pipeline: similarity filtering and prompt building."""

from unittest.mock import call, patch

import pytest
from fastapi import HTTPException

from app.constants import SIMILARITY_HIGH, SIMILARITY_LOW
from app.services.rag import build_prompt, get_answer, get_context, get_sections, handle_rag

CONVERSATION_ID = "c1111111-1111-1111-1111-111111111111"


def make_chunk(filename, text, similarity):
    return {"filename": filename, "chunk_text": text, "similarity": similarity}


HIGH = make_chunk("doc_a.pdf", "High relevance text.", SIMILARITY_HIGH + 0.01)
LOW = make_chunk("doc_b.pdf", "Low relevance text.", (SIMILARITY_HIGH + SIMILARITY_LOW) / 2)


@pytest.fixture
def search_results():
    """Patch the embedding and vector search steps, returning the mock that controls the search results."""
    with (
        patch("app.services.rag.embed_query", return_value=[0.1] * 768),
        patch("app.services.rag.search_similar_chunks", return_value=[]) as search,
    ):
        yield search


class TestGetContext:
    def test_both_populated(self):
        high, low = get_context([HIGH], [LOW])
        assert "doc_a.pdf" in high and "High relevance text." in high
        assert "doc_b.pdf" in low and "Low relevance text." in low

    def test_empty_chunks(self):
        assert get_context([], []) == ("", "")


class TestGetSections:
    def test_high_present(self):
        high, _ = get_sections("some context", "")
        assert "some context" in high

    def test_high_absent_uses_fallback(self):
        high, _ = get_sections("", "")
        assert "no direct match" in high

    def test_low_absent_returns_empty(self):
        _, low = get_sections("some context", "")
        assert low == ""


class TestBuildPrompt:
    @pytest.mark.parametrize(
        ("chunks_high", "chunks_low", "expected_fragments"),
        [
            ([HIGH], [], ["High relevance text.", "doc_a.pdf"]),
            ([], [LOW], ["no direct match", "Low relevance text."]),
            ([HIGH], [LOW], ["High relevance text.", "Low relevance text."]),
            ([], [], ["no direct match"]),
        ],
        ids=["high_only", "low_only", "both", "none"],
    )
    def test_includes_context(self, chunks_high, chunks_low, expected_fragments):
        prompt = build_prompt("What?", chunks_high, chunks_low)
        for fragment in expected_fragments:
            assert fragment in prompt

    def test_history_included(self):
        history = [{"role": "user", "text": "Hello"}, {"role": "assistant", "text": "Hi"}]
        prompt = build_prompt("Follow-up?", [HIGH], [], history=history)
        assert "Hello" in prompt and "Recent history" in prompt


class TestHandleRag:
    def test_no_chunks_returns_none(self, search_results):
        prompt, high, low = handle_rag("query")
        assert prompt is None and high == [] and low == []

    @pytest.mark.parametrize(
        ("scores", "expected_high", "expected_low"),
        [
            ([SIMILARITY_HIGH + 0.05, SIMILARITY_LOW + 0.01], 1, 1),
            ([0.9, 0.85], 2, 0),
            ([SIMILARITY_LOW + 0.01, SIMILARITY_LOW + 0.02], 0, 2),
        ],
        ids=["high_and_low_split", "all_high", "all_low"],
    )
    def test_splits_chunks_by_similarity(self, search_results, scores, expected_high, expected_low):
        search_results.return_value = [make_chunk(f"f{i}.pdf", f"text {i}", s) for i, s in enumerate(scores)]
        _, high, low = handle_rag("query")
        assert len(high) == expected_high and len(low) == expected_low


class TestGetAnswer:
    HIGH_CHUNK = make_chunk("high.pdf", "strong match", SIMILARITY_HIGH + 0.05)
    LOW_CHUNK = make_chunk("low.pdf", "weak match", SIMILARITY_LOW + 0.01)

    def test_no_relevant_chunks_declines_without_calling_llm(self, search_results):
        with patch("app.services.rag.generate_with_fallback") as generate:
            result = get_answer("query", "user-1")
        generate.assert_not_called()
        assert result["sources"] == []
        assert "couldn't find any relevant information" in result["answer"]

    def test_sources_carry_high_and_low_relevance(self, search_results):
        search_results.return_value = [self.HIGH_CHUNK, self.LOW_CHUNK]
        with patch("app.services.rag.generate_with_fallback", return_value="answer"):
            result = get_answer("query", "user-1")
        assert result == {
            "answer": "answer",
            "sources": [
                {"filename": "high.pdf", "chunk_text": "strong match", "relevance": "high"},
                {"filename": "low.pdf", "chunk_text": "weak match", "relevance": "low"},
            ],
        }

    def test_llm_failure_returns_503(self, search_results):
        search_results.return_value = [self.HIGH_CHUNK]
        with (
            patch("app.services.rag.generate_with_fallback", side_effect=RuntimeError("all providers failed")),
            pytest.raises(HTTPException) as exc,
        ):
            get_answer("query", "user-1")
        assert exc.value.status_code == 503

    def test_other_users_conversation_is_rejected_before_any_work(self):
        conversation = {"id": CONVERSATION_ID, "user_id": "someone-else"}
        with (
            patch("app.services.rag.get_conversation", return_value=conversation),
            patch("app.services.rag.get_messages") as get_messages,
            patch("app.services.rag.embed_query") as embed_query,
            patch("app.services.rag.insert_message") as insert_message,
            pytest.raises(HTTPException) as exc,
        ):
            get_answer("query", "user-1", conversation_id=CONVERSATION_ID)
        assert exc.value.status_code == 404
        get_messages.assert_not_called()
        embed_query.assert_not_called()
        insert_message.assert_not_called()

    def test_nonexistent_conversation_is_rejected(self):
        with (
            patch("app.services.rag.get_conversation", return_value=None),
            patch("app.services.rag.insert_message") as insert_message,
            pytest.raises(HTTPException) as exc,
        ):
            get_answer("query", "user-1", conversation_id=CONVERSATION_ID)
        assert exc.value.status_code == 404
        insert_message.assert_not_called()

    def test_owned_conversation_uses_history_and_persists_both_messages(self, search_results):
        search_results.return_value = [self.HIGH_CHUNK]
        conversation = {"id": CONVERSATION_ID, "user_id": "user-1"}
        history = [{"role": "user", "text": "earlier question"}]
        with (
            patch("app.services.rag.get_conversation", return_value=conversation),
            patch("app.services.rag.get_messages", return_value=history),
            patch("app.services.rag.generate_with_fallback", return_value="answer") as generate,
            patch("app.services.rag.insert_message") as insert_message,
        ):
            result = get_answer("query", "user-1", conversation_id=CONVERSATION_ID)
        assert "earlier question" in generate.call_args.args[0]
        assert insert_message.call_args_list == [
            call(CONVERSATION_ID, "user", "query"),
            call(CONVERSATION_ID, "assistant", "answer", result["sources"]),
        ]

    def test_no_conversation_skips_lookup_and_persistence(self, search_results):
        with (
            patch("app.services.rag.get_conversation") as get_conversation,
            patch("app.services.rag.insert_message") as insert_message,
        ):
            get_answer("query", "user-1")
        get_conversation.assert_not_called()
        insert_message.assert_not_called()
