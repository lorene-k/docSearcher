"""Tests for PDF extraction and chunking."""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services.pdf import create_chunks, extract_text, process_pdf
from app.constants import CHUNK_SIZE, CHUNK_OVERLAP, MAX_PDF_PAGES


class TestCreateChunks:
    def test_empty_text_returns_empty_list(self):
        assert create_chunks("") == []

    def test_short_text_single_chunk(self):
        chunks = create_chunks("hello world")
        assert len(chunks) == 1
        assert chunks[0] == "hello world"

    def test_chunk_size_respected(self):
        text = " ".join(["word"] * 600)
        for chunk in create_chunks(text):
            assert len(chunk.split()) <= CHUNK_SIZE

    def test_overlap_present(self):
        words = [f"w{i}" for i in range(CHUNK_SIZE + CHUNK_OVERLAP + 10)]
        chunks = create_chunks(" ".join(words))
        assert len(chunks) >= 2
        assert chunks[0].split()[-CHUNK_OVERLAP:] == chunks[1].split()[:CHUNK_OVERLAP]

    def test_single_word(self):
        assert create_chunks("hello") == ["hello"]

    def test_exact_chunk_size_produces_overlap_chunk(self):
        # CHUNK_SIZE words → 2 chunks: full chunk + overlap tail
        text = " ".join(["x"] * CHUNK_SIZE)
        chunks = create_chunks(text)
        assert len(chunks) == 2
        assert len(chunks[0].split()) == CHUNK_SIZE
        assert len(chunks[1].split()) == CHUNK_OVERLAP


class TestExtractText:
    def test_empty_page_returns_empty_string(self):
        mock_page = MagicMock()
        mock_page.extract_text.return_value = None
        mock_reader = MagicMock()
        mock_reader.pages = [mock_page]
        with patch("app.services.pdf.PdfReader", return_value=mock_reader):
            assert extract_text(b"fake") == ""

    def test_single_page_text(self):
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Hello PDF"
        mock_reader = MagicMock()
        mock_reader.pages = [mock_page]
        with patch("app.services.pdf.PdfReader", return_value=mock_reader):
            assert extract_text(b"fake") == "Hello PDF"

    def test_multi_page_concatenation(self):
        pages = []
        for text in ["Page one. ", "Page two. ", "Page three."]:
            p = MagicMock()
            p.extract_text.return_value = text
            pages.append(p)
        mock_reader = MagicMock()
        mock_reader.pages = pages
        with patch("app.services.pdf.PdfReader", return_value=mock_reader):
            assert extract_text(b"fake") == "Page one. Page two. Page three."

    def test_exceeds_page_limit_raises(self):
        mock_reader = MagicMock()
        mock_reader.pages = [MagicMock() for _ in range(MAX_PDF_PAGES + 1)]
        with patch("app.services.pdf.PdfReader", return_value=mock_reader):
            with pytest.raises(HTTPException) as exc_info:
                extract_text(b"fake")
        assert exc_info.value.status_code == 413

    def test_at_page_limit_succeeds(self):
        pages = [MagicMock() for _ in range(MAX_PDF_PAGES)]
        for p in pages:
            p.extract_text.return_value = "x"
        mock_reader = MagicMock()
        mock_reader.pages = pages
        with patch("app.services.pdf.PdfReader", return_value=mock_reader):
            assert extract_text(b"fake") == "x" * MAX_PDF_PAGES


class TestProcessPdf:
    def test_returns_list_of_strings(self):
        with (
            patch("app.services.pdf.extract_text", return_value="one two three"),
            patch("app.services.pdf.create_chunks", return_value=["one two", "two three"]),
        ):
            assert process_pdf(b"fake") == ["one two", "two three"]

    def test_empty_pdf_raises(self):
        with patch("app.services.pdf.extract_text", return_value=""):
            with pytest.raises(HTTPException) as exc_info:
                process_pdf(b"fake")
        assert exc_info.value.status_code == 400
