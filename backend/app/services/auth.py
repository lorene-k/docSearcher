from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.db.supabase import get_auth_client


def sign_up(email: str, password: str) -> dict | None:
    try:
        res = get_auth_client().auth.sign_up({"email": email, "password": password})
    except AuthApiError as e:
        if e.status == 422 or "already registered" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

    if res.session is None:
        # Email confirmation is enabled for this project: the account was created
        # but there is no session yet until the user confirms via email.
        return None
    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "expires_in": res.session.expires_in,
        "email": email,
    }


def confirm_email(token_hash: str, otp_type: str) -> dict:
    invalid_link = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="Confirmation link is invalid or has expired"
    )
    try:
        res = get_auth_client().auth.verify_otp({"token_hash": token_hash, "type": otp_type})
    except AuthApiError:
        raise invalid_link
    if res.session is None or res.user is None:
        raise invalid_link
    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "expires_in": res.session.expires_in,
        "email": res.user.email,
    }


def sign_in(email: str, password: str) -> dict:
    try:
        res = get_auth_client().auth.sign_in_with_password({"email": email, "password": password})
    except AuthApiError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "expires_in": res.session.expires_in,
        "email": email,
    }


def refresh(refresh_token: str) -> dict:
    try:
        res = get_auth_client().auth.refresh_session(refresh_token)
    except AuthApiError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "expires_in": res.session.expires_in,
    }


def get_user_from_token(token: str) -> dict:
    try:
        res = get_auth_client().auth.get_user(token)
    except AuthApiError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"sub": res.user.id, "email": res.user.email}
