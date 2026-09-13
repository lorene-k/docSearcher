from supabase_auth.errors import AuthApiError
from fastapi import HTTPException, status

from app.db.supabase import get_auth_client


def sign_up(email: str, password: str) -> dict:
    try:
        res = get_auth_client().auth.sign_up({"email": email, "password": password})
    except AuthApiError as e:
        if e.status == 422 or "already registered" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

    if res.session is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration requires email confirmation; disable it in the Supabase dashboard for this app",
        )
    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "expires_in": res.session.expires_in,
        "email": email,
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
