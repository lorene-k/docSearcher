import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.constants import MAX_MESSAGE_LENGTH
from app.db.supabase import create_conversation, get_conversation, get_conversations, get_messages, insert_message
from app.middleware.auth import get_current_user

conversations_router = APIRouter(prefix="/conversations")


def require_owned_conversation(conversation_id: uuid.UUID, user_id: str) -> None:
    conversation = get_conversation(str(conversation_id))
    if not conversation or conversation["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")


@conversations_router.post("", status_code=status.HTTP_201_CREATED)
def new_conversation(user: dict = Depends(get_current_user)) -> dict:
    return create_conversation(user["sub"])


@conversations_router.get("")
def list_conversations(user: dict = Depends(get_current_user)) -> list[dict]:
    return get_conversations(user["sub"])


@conversations_router.get("/{conversation_id}/messages")
def list_messages(conversation_id: uuid.UUID, user: dict = Depends(get_current_user)) -> list[dict]:
    require_owned_conversation(conversation_id, user["sub"])
    return get_messages(str(conversation_id))


class MessageInput(BaseModel):
    # Assistant turns are written by the server; a client writing them would feed
    # its own text back into the next prompt.
    role: Literal["user"]
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    sources: list[dict] | None = None


@conversations_router.post("/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
def add_message(conversation_id: uuid.UUID, body: MessageInput, user: dict = Depends(get_current_user)) -> dict:
    require_owned_conversation(conversation_id, user["sub"])
    return insert_message(str(conversation_id), body.role, body.text, body.sources)
