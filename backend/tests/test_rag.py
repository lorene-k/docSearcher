"""Tests for RAG pipeline: similarity filtering and prompt building."""
from typing import ClassVar
from unittest.mock import call, patch

import pytest
from fastapi import HTTPException

from app.constants import SIMILARITY_HIGH, SIMILARITY_LOW
from app.services.rag import build_prompt, get_answer, get_context, get_sections, handle_rag


def make_chunk(filename, text, similarity):
    return {"filename": filename, "chunk_text": text, "similarity": similarity}


HIGH = make_chunk("doc_a.pdf", "High relevance text.", SIMILARITY_HIGH + 0.01)
LOW = make_chunk("doc_b.pdf", "Low relevance text.", (SIMILARITY_HIGH + SIMILARITY_LOW) / 2)


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
        assert "correspondance directe" in high

    def test_low_absent_returns_empty(self):
        _, low = get_sections("some context", "")
        assert low == ""


class TestBuildPrompt:
    def test_high_only(self):
        p = build_prompt("What?", [HIGH], [])
        assert "High relevance text." in p and "doc_a.pdf" in p

    def test_low_only(self):
        p = build_prompt("What?", [], [LOW])
        assert "correspondance directe" in p and "Low relevance text." in p

    def test_both(self):
        p = build_prompt("What?", [HIGH], [LOW])
        assert "High relevance text." in p and "Low relevance text." in p

    def test_none(self):
        assert "correspondance directe" in build_prompt("What?", [], [])

    def test_history_included(self):
        history = [{"role": "user", "text": "Bonjour"}, {"role": "assistant", "text": "Salut"}]
        p = build_prompt("Suite?", [HIGH], [], history=history)
        assert "Bonjour" in p and "Historique récent" in p


class TestHandleRag:
    def _chunks(self, scores):
        return [{"filename": f"f{i}.pdf", "chunk_text": f"text {i}", "similarity": s} for i, s in enumerate(scores)]

    def test_no_chunks_returns_none(self):
        with (
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=[]),
        ):
            prompt, high, low = handle_rag("query")
        assert prompt is None and high == [] and low == []

    def test_high_and_low_split(self):
        chunks = self._chunks([SIMILARITY_HIGH + 0.05, SIMILARITY_LOW + 0.01])
        with (
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=chunks),
        ):
            _, high, low = handle_rag("query")
        assert len(high) == 1 and len(low) == 1

    def test_all_high(self):
        chunks = self._chunks([0.9, 0.85])
        with (
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=chunks),
        ):
            _, high, low = handle_rag("query")
        assert len(high) == 2 and len(low) == 0

    def test_all_low(self):
        chunks = self._chunks([SIMILARITY_LOW + 0.01, SIMILARITY_LOW + 0.02])
        with (
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=chunks),
        ):
            _, high, low = handle_rag("query")
        assert len(high) == 0 and len(low) == 2


class TestGetAnswer:
    CONVERSATION_ID = "c1111111-1111-1111-1111-111111111111"
    HIGH_CHUNK: ClassVar[dict] = {"filename": "high.pdf", "chunk_text": "strong match", "similarity": SIMILARITY_HIGH + 0.05}
    LOW_CHUNK: ClassVar[dict] = {"filename": "low.pdf", "chunk_text": "weak match", "similarity": SIMILARITY_LOW + 0.01}

    def test_no_relevant_chunks_declines_without_calling_llm(self):
        with (
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=[]),
            patch("app.services.rag.generate_with_fallback") as generate,
        ):
            result = get_answer("query", "user-1")
        generate.assert_not_called()
        assert result["sources"] == []
        assert "aucune information pertinente" in result["answer"]

    def test_sources_carry_high_and_low_relevance(self):
        with (
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=[self.HIGH_CHUNK, self.LOW_CHUNK]),
            patch("app.services.rag.generate_with_fallback", return_value="answer"),
        ):
            result = get_answer("query", "user-1")
        assert result == {
            "answer": "answer",
            "sources": [
                {"filename": "high.pdf", "chunk_text": "strong match", "relevance": "high"},
                {"filename": "low.pdf", "chunk_text": "weak match", "relevance": "low"},
            ],
        }

    def test_llm_failure_returns_503(self):
        with (
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=[self.HIGH_CHUNK]),
            patch("app.services.rag.generate_with_fallback", side_effect=RuntimeError("all providers failed")),
            pytest.raises(HTTPException) as exc,
        ):
            get_answer("query", "user-1")
        assert exc.value.status_code == 503

    def test_other_users_conversation_is_rejected_before_any_work(self):
        conversation = {"id": self.CONVERSATION_ID, "user_id": "someone-else"}
        with (
            patch("app.services.rag.get_conversation", return_value=conversation),
            patch("app.services.rag.get_messages") as get_messages,
            patch("app.services.rag.embed_query") as embed_query,
            patch("app.services.rag.insert_message") as insert_message,
            pytest.raises(HTTPException) as exc,
        ):
            get_answer("query", "user-1", conversation_id=self.CONVERSATION_ID)
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
            get_answer("query", "user-1", conversation_id=self.CONVERSATION_ID)
        assert exc.value.status_code == 404
        insert_message.assert_not_called()

    def test_owned_conversation_uses_history_and_persists_both_messages(self):
        conversation = {"id": self.CONVERSATION_ID, "user_id": "user-1"}
        history = [{"role": "user", "text": "earlier question"}]
        with (
            patch("app.services.rag.get_conversation", return_value=conversation),
            patch("app.services.rag.get_messages", return_value=history),
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=[self.HIGH_CHUNK]),
            patch("app.services.rag.generate_with_fallback", return_value="answer") as generate,
            patch("app.services.rag.insert_message") as insert_message,
        ):
            result = get_answer("query", "user-1", conversation_id=self.CONVERSATION_ID)
        assert "earlier question" in generate.call_args.args[0]
        assert insert_message.call_args_list == [
            call(self.CONVERSATION_ID, "user", "query"),
            call(self.CONVERSATION_ID, "assistant", "answer", result["sources"]),
        ]

    def test_no_conversation_skips_lookup_and_persistence(self):
        with (
            patch("app.services.rag.get_conversation") as get_conversation,
            patch("app.services.rag.embed_query", return_value=[0.1] * 768),
            patch("app.services.rag.search_similar_chunks", return_value=[]),
            patch("app.services.rag.insert_message") as insert_message,
        ):
            get_answer("query", "user-1")
        get_conversation.assert_not_called()
        insert_message.assert_not_called()
