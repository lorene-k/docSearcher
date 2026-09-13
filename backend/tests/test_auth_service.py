"""Tests for the real Supabase Auth error mapping in app/services/auth.py."""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from supabase_auth.errors import AuthApiError

from app.services.auth import get_user_from_token, refresh, sign_in, sign_up

SESSION = SimpleNamespace(access_token="at", refresh_token="rt", expires_in=3600)


def auth_client(method: str, *, side_effect=None, return_value=None) -> MagicMock:
    client = MagicMock()
    getattr(client.auth, method).side_effect = side_effect
    getattr(client.auth, method).return_value = return_value
    return client


def expect_http_error(fn, *args) -> HTTPException:
    with pytest.raises(HTTPException) as exc:
        fn(*args)
    return exc.value


class TestSignUp:
    def test_already_registered_status_maps_to_409(self):
        client = auth_client("sign_up", side_effect=AuthApiError("exists", 422, None))
        with patch("app.services.auth.get_auth_client", return_value=client):
            assert expect_http_error(sign_up, "a@b.com", "pw").status_code == 409

    def test_already_registered_message_maps_to_409(self):
        client = auth_client("sign_up", side_effect=AuthApiError("User already registered", 400, None))
        with patch("app.services.auth.get_auth_client", return_value=client):
            assert expect_http_error(sign_up, "a@b.com", "pw").status_code == 409

    def test_other_auth_error_maps_to_400(self):
        client = auth_client("sign_up", side_effect=AuthApiError("weak password", 400, None))
        with patch("app.services.auth.get_auth_client", return_value=client):
            assert expect_http_error(sign_up, "a@b.com", "pw").status_code == 400

    def test_confirmation_pending_returns_none(self):
        client = auth_client("sign_up", return_value=SimpleNamespace(session=None))
        with patch("app.services.auth.get_auth_client", return_value=client):
            assert sign_up("a@b.com", "pw") is None

    def test_immediate_session_returns_tokens(self):
        client = auth_client("sign_up", return_value=SimpleNamespace(session=SESSION))
        with patch("app.services.auth.get_auth_client", return_value=client):
            assert sign_up("a@b.com", "pw") == {
                "access_token": "at",
                "refresh_token": "rt",
                "expires_in": 3600,
                "email": "a@b.com",
            }


class TestSignIn:
    def test_auth_error_maps_to_401(self):
        client = auth_client("sign_in_with_password", side_effect=AuthApiError("Invalid login credentials", 400, None))
        with patch("app.services.auth.get_auth_client", return_value=client):
            assert expect_http_error(sign_in, "a@b.com", "wrong").status_code == 401


class TestRefresh:
    def test_auth_error_maps_to_401(self):
        client = auth_client("refresh_session", side_effect=AuthApiError("Invalid Refresh Token", 400, None))
        with patch("app.services.auth.get_auth_client", return_value=client):
            assert expect_http_error(refresh, "stale").status_code == 401


class TestGetUserFromToken:
    def test_auth_error_maps_to_401_with_auth_header(self):
        client = auth_client("get_user", side_effect=AuthApiError("invalid JWT", 401, None))
        with patch("app.services.auth.get_auth_client", return_value=client):
            error = expect_http_error(get_user_from_token, "bad")
        assert error.status_code == 401
        assert error.headers == {"WWW-Authenticate": "Bearer"}

    def test_valid_token_returns_user(self):
        client = auth_client("get_user", return_value=SimpleNamespace(user=SimpleNamespace(id="u1", email="a@b.com")))
        with patch("app.services.auth.get_auth_client", return_value=client):
            assert get_user_from_token("good") == {"sub": "u1", "email": "a@b.com"}
