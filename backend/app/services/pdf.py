import io
from pypdf import PdfReader
from app.constants import CHUNK_SIZE, CHUNK_OVERLAP


def extract_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
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
    return create_chunks(text)
