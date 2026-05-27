from fastapi import APIRouter
from pydantic import BaseModel
from app.services.rag import get_answer


class ChatInput(BaseModel):
    text: str


chat_router = APIRouter()


@chat_router.post("/chat")
async def handle_chat(input: ChatInput) -> dict:
    return get_answer(input.text)
