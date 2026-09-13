from fastapi import APIRouter, Depends, HTTPException, status

from app.db.supabase import delete_document, get_filenames
from app.middleware.auth import get_current_user

documents_router = APIRouter()


@documents_router.get("/documents")
def handle_documents(_user: dict = Depends(get_current_user)) -> list[str]:
    return get_filenames()


@documents_router.delete("/documents/{filename}")
def handle_delete_document(filename: str, _user: dict = Depends(get_current_user)) -> dict:
    deleted = delete_document(filename)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document '{filename}' not found")
    return {"message": "document deleted"}
