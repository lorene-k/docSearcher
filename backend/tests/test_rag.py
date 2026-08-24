"""Tests for RAG pipeline: similarity filtering and prompt building."""
from unittest.mock import patch

from app.services.rag import build_prompt, get_context, get_sections, handle_rag
from app.constants import SIMILARITY_HIGH, SIMILARITY_LOW


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
