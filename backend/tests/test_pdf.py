"""Tests for PDF extraction and chunking."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from pypdf.errors import PdfReadError

from app.constants import CHUNK_OVERLAP, CHUNK_SIZE, MAX_PDF_PAGES
from app.services.pdf import create_chunks, extract_text, process_pdf


def fake_reader(page_texts):
    """Patch PdfReader with a reader whose pages return the given texts."""
    pages = []
    for text in page_texts:
        page = MagicMock()
        page.extract_text.return_value = text
        pages.append(page)
    return patch("app.services.pdf.PdfReader", return_value=MagicMock(pages=pages))


class TestCreateChunks:
    @pytest.mark.parametrize(
        ("text", "expected"),
        [("", []), ("hello", ["hello"]), ("hello world", ["hello world"])],
        ids=["empty_text", "single_word", "short_text"],
    )
    def test_small_inputs(self, text, expected):
        assert create_chunks(text) == expected

    def test_chunk_size_respected(self):
        text = " ".join(["word"] * 600)
        for chunk in create_chunks(text):
            assert len(chunk.split()) <= CHUNK_SIZE

    def test_overlap_present(self):
        words = [f"w{i}" for i in range(CHUNK_SIZE + CHUNK_OVERLAP + 10)]
        chunks = create_chunks(" ".join(words))
        assert len(chunks) >= 2
        assert chunks[0].split()[-CHUNK_OVERLAP:] == chunks[1].split()[:CHUNK_OVERLAP]

    def test_exact_chunk_size_produces_overlap_chunk(self):
        # A text of exactly CHUNK_SIZE words yields a full chunk plus a tail made of the overlap
        chunks = create_chunks(" ".join(["x"] * CHUNK_SIZE))
        assert len(chunks) == 2
        assert len(chunks[0].split()) == CHUNK_SIZE
        assert len(chunks[1].split()) == CHUNK_OVERLAP


class TestExtractText:
    @pytest.mark.parametrize(
        ("page_texts", "expected"),
        [
            ([None], ""),
            (["Hello PDF"], "Hello PDF"),
            (["Page one. ", "Page two. ", "Page three."], "Page one. Page two. Page three."),
        ],
        ids=["empty_page", "single_page", "multi_page_concatenation"],
    )
    def test_extracts_page_text(self, page_texts, expected):
        with fake_reader(page_texts):
            assert extract_text(b"fake") == expected

    def test_exceeds_page_limit_raises(self):
        with fake_reader(["x"] * (MAX_PDF_PAGES + 1)), pytest.raises(HTTPException) as exc_info:
            extract_text(b"fake")
        assert exc_info.value.status_code == 413

    def test_at_page_limit_succeeds(self):
        with fake_reader(["x"] * MAX_PDF_PAGES):
            assert extract_text(b"fake") == "x" * MAX_PDF_PAGES


class TestProcessPdf:
    def test_returns_list_of_strings(self):
        with (
            patch("app.services.pdf.extract_text", return_value="one two three"),
            patch("app.services.pdf.create_chunks", return_value=["one two", "two three"]),
        ):
            assert process_pdf(b"fake") == ["one two", "two three"]

    def test_empty_pdf_raises(self):
        with patch("app.services.pdf.extract_text", return_value=""), pytest.raises(HTTPException) as exc_info:
            process_pdf(b"fake")
        assert exc_info.value.status_code == 400


class TestUnreadablePdf:
    """pypdf raises for corrupt, truncated and password-protected files."""

    def test_unopenable_file_is_a_bad_request(self):
        with (
            patch("app.services.pdf.PdfReader", side_effect=PdfReadError("EOF marker not found")),
            pytest.raises(HTTPException) as exc,
        ):
            extract_text(b"not really a pdf")
        assert exc.value.status_code == 400
        assert "corrupt or password-protected" in exc.value.detail

    def test_failure_while_reading_pages_is_a_bad_request(self):
        page = MagicMock()
        page.extract_text.side_effect = PdfReadError("file has not been decrypted")
        with (
            patch("app.services.pdf.PdfReader", return_value=MagicMock(pages=[page])),
            pytest.raises(HTTPException) as exc,
        ):
            extract_text(b"%PDF-encrypted")
        assert exc.value.status_code == 400
