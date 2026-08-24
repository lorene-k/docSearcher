import io
from fastapi import HTTPException, status
from pypdf import PdfReader
from app.constants import CHUNK_SIZE, CHUNK_OVERLAP, MAX_PDF_PAGES


def extract_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    if len(reader.pages) > MAX_PDF_PAGES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF exceeds {MAX_PDF_PAGES} page limit",
        )
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
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
