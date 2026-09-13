"""Integration tests for all API endpoints with mocked Supabase and Google clients."""
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException, status

from app.main import app
from app.middleware.auth import get_current_user

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()
    client.cookies.clear()


def auth_headers(user_id="user-123", email="test@example.com"):
    app.dependency_overrides[get_current_user] = lambda: {"sub": user_id, "email": email}
    return {"Authorization": "Bearer test-token"}


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


class TestAuthRegister:
    def test_success(self):
        tokens = {"access_token": "at", "refresh_token": "rt", "expires_in": 3600, "email": "a@b.com"}
        with patch("app.api.auth.sign_up", return_value=tokens):
            r = client.post("/auth/register", json={"email": "a@b.com", "password": "secret123"})
        assert r.status_code == 201
        assert r.json() == {"email": "a@b.com"}
        assert r.cookies.get("access_token") == "at"
        assert r.cookies.get("refresh_token") == "rt"

    def test_duplicate_email(self):
        with patch(
            "app.api.auth.sign_up",
            side_effect=HTTPException(status.HTTP_409_CONFLICT, "Email already registered"),
        ):
            r = client.post("/auth/register", json={"email": "a@b.com", "password": "secret123"})
        assert r.status_code == 409


class TestAuthLogin:
    def test_success(self):
        tokens = {"access_token": "at", "refresh_token": "rt", "expires_in": 3600, "email": "a@b.com"}
        with patch("app.api.auth.sign_in", return_value=tokens):
            r = client.post("/auth/login", json={"email": "a@b.com", "password": "mypass"})
        assert r.status_code == 200
        assert r.json() == {"email": "a@b.com"}
        assert r.cookies.get("access_token") == "at"

    def test_invalid_credentials(self):
        with patch(
            "app.api.auth.sign_in",
            side_effect=HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials"),
        ):
            r = client.post("/auth/login", json={"email": "a@b.com", "password": "wrong"})
        assert r.status_code == 401


class TestAuthRefresh:
    def test_no_cookie_returns_401(self):
        assert client.post("/auth/refresh").status_code == 401

    def test_success_rotates_cookies(self):
        tokens = {"access_token": "new-at", "refresh_token": "new-rt", "expires_in": 3600, "email": "a@b.com"}
        client.cookies.set("refresh_token", "old-rt")
        with patch("app.api.auth.refresh", return_value=tokens):
            r = client.post("/auth/refresh")
        assert r.status_code == 200
        assert r.cookies.get("access_token") == "new-at"
        assert r.cookies.get("refresh_token") == "new-rt"


class TestAuthLogout:
    def test_clears_cookies(self):
        client.cookies.set("access_token", "at")
        client.cookies.set("refresh_token", "rt")
        r = client.post("/auth/logout")
        assert r.status_code == 200
        assert not r.cookies.get("access_token")
        assert not r.cookies.get("refresh_token")


class TestUpload:
    def test_requires_auth(self):
        r = client.post("/upload", files={"file": ("t.pdf", b"%PDF", "application/pdf")})
        assert r.status_code == 401

    def test_success(self):
        with patch("app.api.upload.get_filenames", return_value=[]), \
             patch("app.api.upload.process_pdf", return_value=["c1", "c2"]), \
             patch("app.api.upload.embed_chunks", return_value=[[0.1]*768, [0.2]*768]), \
             patch("app.api.upload.insert_chunks", return_value=None):
            r = client.post("/upload", files={"file": ("t.pdf", b"%PDF", "application/pdf")}, headers=auth_headers())
        assert r.status_code == 200 and r.json()["chunks_created"] == 2

    def test_duplicate_filename_rejected(self):
        with patch("app.api.upload.get_filenames", return_value=["t.pdf"]):
            r = client.post("/upload", files={"file": ("t.pdf", b"%PDF", "application/pdf")}, headers=auth_headers())
        assert r.status_code == 409


class TestChat:
    def test_requires_auth(self):
        assert client.post("/chat", json={"text": "hi"}).status_code == 401

    def test_returns_answer(self):
        with patch("app.api.chat.get_answer", return_value={"answer": "42", "sources": []}):
            r = client.post("/chat", json={"text": "What?"}, headers=auth_headers())
        assert r.status_code == 200 and r.json()["answer"] == "42"


class TestDocuments:
    def test_requires_auth(self):
        assert client.get("/documents").status_code == 401
        assert client.delete("/documents/test.pdf").status_code == 401

    def test_list(self):
        with patch("app.api.documents.get_filenames", return_value=["a.pdf", "b.pdf"]):
            r = client.get("/documents", headers=auth_headers())
        assert r.status_code == 200 and set(r.json()) == {"a.pdf", "b.pdf"}

    def test_delete(self):
        with patch("app.api.documents.delete_document", return_value=True):
            r = client.delete("/documents/test.pdf", headers=auth_headers())
        assert r.status_code == 200 and r.json()["message"] == "document deleted"

    def test_delete_not_found(self):
        with patch("app.api.documents.delete_document", return_value=False):
            r = client.delete("/documents/missing.pdf", headers=auth_headers())
        assert r.status_code == 404


class TestConversations:
    def test_create(self):
        conv = {"id": "c1", "user_id": "user-123", "created_at": "2024-01-01T00:00:00"}
        with patch("app.api.conversations.create_conversation", return_value=conv):
            r = client.post("/conversations", headers=auth_headers())
        assert r.status_code == 201 and r.json()["id"] == "c1"

    def test_list(self):
        convs = [{"id": "c1", "user_id": "user-123", "created_at": "2024-01-01T00:00:00"}]
        with patch("app.api.conversations.get_conversations", return_value=convs):
            r = client.get("/conversations", headers=auth_headers())
        assert r.status_code == 200 and len(r.json()) == 1

    def test_messages(self):
        conversation_id = "c1111111-1111-1111-1111-111111111111"
        conv = {"id": conversation_id, "user_id": "user-123", "created_at": "2024-01-01T00:00:00"}
        msgs = [{"id": "m1", "conversation_id": conversation_id, "role": "user", "text": "Hi", "sources": [], "created_at": "2024-01-01T00:00:01"}]
        with patch("app.api.conversations.get_conversation", return_value=conv), \
             patch("app.api.conversations.get_messages", return_value=msgs):
            r = client.get(f"/conversations/{conversation_id}/messages", headers=auth_headers())
        assert r.status_code == 200 and r.json()[0]["text"] == "Hi"

    def test_messages_invalid_conversation_id(self):
        r = client.get("/conversations/not-a-uuid/messages", headers=auth_headers())
        assert r.status_code == 422
