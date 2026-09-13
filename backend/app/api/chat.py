import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.services.rag import get_answer


class ChatInput(BaseModel):
    text: str
    conversation_id: uuid.UUID | None = None


chat_router = APIRouter()


@chat_router.post("/chat")
def handle_chat(input: ChatInput, user: dict = Depends(get_current_user)) -> dict:
    conversation_id = str(input.conversation_id) if input.conversation_id else None
    return get_answer(input.text, user["sub"], conversation_id=conversation_id)
