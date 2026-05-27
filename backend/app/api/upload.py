from fastapi import UploadFile, APIRouter
from app.services.pdf import process_pdf
from app.services.embedding import embed_chunks
from app.db.supabase import insert_chunks

upload_router = APIRouter()

@upload_router.post("/upload")
async def handle_upload(file: UploadFile) -> None:
    filename = file.filename
    content = await file.read()
    chunks = process_pdf(content)
    embeddings = embed_chunks(chunks)
    chunk_data = [
        {"filename": filename, "chunk_text": chunk, "embedding": embedding}
        for chunk, embedding in zip(chunks, embeddings)
    ]
    insert_chunks(filename, chunk_data)
    return {"message": "file uploaded"}
