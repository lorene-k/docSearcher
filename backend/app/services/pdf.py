import io

from fastapi import HTTPException, status
from pypdf import PdfReader
from pypdf.errors import PyPdfError

from app.constants import CHUNK_OVERLAP, CHUNK_SIZE, MAX_PDF_PAGES

UNREADABLE_PDF = "PDF could not be read - it may be corrupt or password-protected"


def extract_text(file_bytes: bytes) -> str:
    # Covers corrupt files, truncated streams and password-protected ones, which all
    # raise from pypdf rather than returning anything readable.
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        page_count = len(reader.pages)
    except PyPdfError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=UNREADABLE_PDF)
    if page_count > MAX_PDF_PAGES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"PDF exceeds {MAX_PDF_PAGES} page limit",
        )
    text = ""
    try:
        for page in reader.pages:
            text += page.extract_text() or ""
    except PyPdfError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=UNREADABLE_PDF)
    return text


def create_chunks(text: str) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + CHUNK_SIZE
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def process_pdf(file_bytes: bytes) -> list[str]:
    text = extract_text(file_bytes)
    chunks = create_chunks(text)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF has no extractable text",
        )
    return chunks
