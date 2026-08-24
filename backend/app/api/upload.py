from fastapi import Depends, HTTPException, UploadFile, APIRouter, status

from app.db.supabase import insert_chunks
from app.middleware.auth import get_current_user
from app.services.embedding import embed_chunks
from app.services.pdf import process_pdf

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB

upload_router = APIRouter()


@upload_router.post("/upload")
async def handle_upload(file: UploadFile, _user: dict = Depends(get_current_user)) -> dict:
    filename = file.filename
    if not filename or not filename.lower().endswith(".pdf") or file.content_type != "application/pdf":
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only PDF files are accepted")

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 20 MB limit")

    chunks = process_pdf(content)
    embeddings = embed_chunks(chunks)
    chunk_data = [
        {"filename": filename, "chunk_text": chunk, "embedding": embedding}
        for chunk, embedding in zip(chunks, embeddings)
    ]
    insert_chunks(filename, chunk_data)
    return {"message": "file uploaded", "chunks_created": len(chunk_data)}
