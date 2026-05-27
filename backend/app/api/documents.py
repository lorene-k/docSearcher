from fastapi import APIRouter
from app.db.supabase import get_filenames


documents_router = APIRouter()


@documents_router.get("/documents")
async def handle_documents() -> list[str]:
    return  get_filenames()
