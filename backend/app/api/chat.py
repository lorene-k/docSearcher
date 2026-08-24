from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.services.rag import get_answer


class ChatInput(BaseModel):
    text: str
    conversation_id: str | None = None


chat_router = APIRouter()


@chat_router.post("/chat")
async def handle_chat(input: ChatInput, user: dict = Depends(get_current_user)) -> dict:
    return get_answer(input.text, user["sub"], conversation_id=input.conversation_id)
