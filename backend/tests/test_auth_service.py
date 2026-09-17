"""Tests for the real Supabase Auth error mapping in app/services/auth.py."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from supabase_auth.errors import AuthApiError

from app.services.auth import (
    confirm_email,
    get_user_from_token,
    refresh,
    resend_confirmation,
    sign_in,
    sign_up,
)

SESSION = SimpleNamespace(access_token="at", refresh_token="rt", expires_in=3600)
EXPECTED_TOKENS = {"access_token": "at", "refresh_token": "rt", "expires_in": 3600, "email": "a@b.com"}


@pytest.fixture
def auth_client():
    """Mocked Supabase auth client, patched in for every call to get_auth_client."""
    client = MagicMock()
    with patch("app.services.auth.get_auth_client", return_value=client):
        yield client.auth


def expect_http_error(fn, *args) -> HTTPException:
    with pytest.raises(HTTPException) as exc:
        fn(*args)
    return exc.value


class TestSignUp:
    @pytest.mark.parametrize(
        ("error", "expected_status"),
        [
            (AuthApiError("exists", 422, None), 409),
            (AuthApiError("User already registered", 400, None), 409),
            (AuthApiError("weak password", 400, None), 400),
        ],
        ids=["already_registered_status", "already_registered_message", "other_auth_error"],
    )
    def test_auth_error_mapping(self, auth_client, error, expected_status):
        auth_client.sign_up.side_effect = error
        assert expect_http_error(sign_up, "a@b.com", "pw").status_code == expected_status

    def test_confirmation_pending_returns_none(self, auth_client):
        auth_client.sign_up.return_value = SimpleNamespace(session=None)
        assert sign_up("a@b.com", "pw") is None

    def test_immediate_session_returns_tokens(self, auth_client):
        auth_client.sign_up.return_value = SimpleNamespace(session=SESSION)
        assert sign_up("a@b.com", "pw") == EXPECTED_TOKENS


class TestConfirmEmail:
    def test_valid_link_returns_session_tokens(self, auth_client):
        auth_client.verify_otp.return_value = SimpleNamespace(session=SESSION, user=SimpleNamespace(email="a@b.com"))
        assert confirm_email("pkce_abc", "email") == EXPECTED_TOKENS
        auth_client.verify_otp.assert_called_once_with({"token_hash": "pkce_abc", "type": "email"})

    def test_used_or_expired_link_maps_to_400(self, auth_client):
        auth_client.verify_otp.side_effect = AuthApiError("Token has expired or is invalid", 403, None)
        assert expect_http_error(confirm_email, "used", "email").status_code == 400

    def test_missing_session_maps_to_400(self, auth_client):
        auth_client.verify_otp.return_value = SimpleNamespace(session=None, user=None)
        assert expect_http_error(confirm_email, "abc", "email").status_code == 400


class TestSignIn:
    def test_auth_error_maps_to_401(self, auth_client):
        auth_client.sign_in_with_password.side_effect = AuthApiError("Invalid login credentials", 400, None)
        assert expect_http_error(sign_in, "a@b.com", "wrong").status_code == 401

    def test_unconfirmed_email_maps_to_403(self, auth_client):
        auth_client.sign_in_with_password.side_effect = AuthApiError("Email not confirmed", 400, "email_not_confirmed")
        assert expect_http_error(sign_in, "a@b.com", "right").status_code == 403


class TestResendConfirmation:
    def test_asks_supabase_for_a_new_signup_email(self, auth_client):
        resend_confirmation("a@b.com")
        auth_client.resend.assert_called_once_with({"type": "signup", "email": "a@b.com"})

    def test_swallows_auth_errors_so_callers_learn_nothing(self, auth_client):
        auth_client.resend.side_effect = AuthApiError("over_email_send_rate_limit", 429, None)
        assert resend_confirmation("a@b.com") is None


class TestRefresh:
    def test_auth_error_maps_to_401(self, auth_client):
        auth_client.refresh_session.side_effect = AuthApiError("Invalid Refresh Token", 400, None)
        assert expect_http_error(refresh, "stale").status_code == 401


class TestGetUserFromToken:
    def test_auth_error_maps_to_401_with_auth_header(self, auth_client):
        auth_client.get_user.side_effect = AuthApiError("invalid JWT", 401, None)
        error = expect_http_error(get_user_from_token, "bad")
        assert error.status_code == 401
        assert error.headers == {"WWW-Authenticate": "Bearer"}

    def test_valid_token_returns_user(self, auth_client):
        auth_client.get_user.return_value = SimpleNamespace(user=SimpleNamespace(id="u1", email="a@b.com"))
        assert get_user_from_token("good") == {"sub": "u1", "email": "a@b.com"}
