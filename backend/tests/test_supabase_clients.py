"""Tests that data access and auth flows use the right Supabase key."""

from unittest.mock import MagicMock, patch

import pytest

from app.db import supabase as db

SUPABASE_URL = "https://project.supabase.co"


@pytest.fixture(autouse=True)
def _fresh_clients(monkeypatch):
    monkeypatch.setattr(db, "_client", None)
    monkeypatch.setattr(db, "_auth_client", None)
    monkeypatch.setattr(db.settings, "supabase_url", SUPABASE_URL)
    monkeypatch.setattr(db.settings, "supabase_service_key", "service-role-key")
    monkeypatch.setattr(db.settings, "supabase_public_key", "anon-key")


@pytest.mark.parametrize(
    ("get_client", "expected_key"),
    [(db.get_client, "service-role-key"), (db.get_auth_client, "anon-key")],
    ids=["data_client_uses_service_role_key", "auth_client_uses_anon_key"],
)
def test_client_uses_the_right_key(get_client, expected_key):
    with patch("app.db.supabase.create_client") as create_client:
        get_client()
    create_client.assert_called_once_with(SUPABASE_URL, expected_key)


def test_clients_are_cached_and_kept_separate():
    created_clients = [MagicMock(name="service"), MagicMock(name="anon")]
    with patch("app.db.supabase.create_client", side_effect=created_clients) as create_client:
        service_first, service_again = db.get_client(), db.get_client()
        anon_first, anon_again = db.get_auth_client(), db.get_auth_client()
    assert service_first is service_again
    assert anon_first is anon_again
    assert service_first is not anon_first
    assert create_client.call_count == 2


def test_data_access_never_uses_the_auth_client():
    service = MagicMock()
    service.table.return_value.insert.return_value.execute.return_value.data = [{"id": "m1"}]
    with (
        patch("app.db.supabase.get_client", return_value=service),
        patch("app.db.supabase.get_auth_client", side_effect=AssertionError("anon client used for data access")),
    ):
        assert db.insert_message("c1", "user", "hi") == {"id": "m1"}
    service.table.assert_called_once_with("messages")
    service.table.return_value.insert.assert_called_once_with(
        {"conversation_id": "c1", "role": "user", "text": "hi", "sources": []}
    )
