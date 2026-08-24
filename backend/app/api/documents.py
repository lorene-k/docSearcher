from fastapi import APIRouter, Depends

from app.db.supabase import delete_document, get_filenames
from app.middleware.auth import get_current_user

documents_router = APIRouter()


@documents_router.get("/documents")
async def handle_documents(_user: dict = Depends(get_current_user)) -> list[str]:
    return get_filenames()


@documents_router.delete("/documents/{filename}")
async def handle_delete_document(filename: str, _user: dict = Depends(get_current_user)) -> dict:
    delete_document(filename)
    return {"message": "document deleted"}
