from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError
from supabase_auth.types import Session

from app.db.supabase import get_auth_client

EMAIL_NOT_CONFIRMED = "email_not_confirmed"


def _session_tokens(session: Session, email: str | None) -> dict:
    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": session.expires_in,
        "email": email,
    }


# Supabase error code -> (HTTP status, detail the frontend turns into a message).
# The detail is a stable code, not prose, so the wording lives with the UI.
SIGN_UP_ERRORS = {
    "user_already_exists": (status.HTTP_409_CONFLICT, "email_exists"),
    "email_exists": (status.HTTP_409_CONFLICT, "email_exists"),
    "weak_password": (status.HTTP_400_BAD_REQUEST, "weak_password"),
    "email_address_invalid": (status.HTTP_400_BAD_REQUEST, "email_invalid"),
    "over_email_send_rate_limit": (status.HTTP_429_TOO_MANY_REQUESTS, "rate_limited"),
    "over_request_rate_limit": (status.HTTP_429_TOO_MANY_REQUESTS, "rate_limited"),
    "signup_disabled": (status.HTTP_403_FORBIDDEN, "signup_disabled"),
    "email_provider_disabled": (status.HTTP_403_FORBIDDEN, "signup_disabled"),
}


def sign_up(email: str, password: str) -> dict | None:
    try:
        res = get_auth_client().auth.sign_up({"email": email, "password": password})
    except AuthApiError as e:
        if e.code in SIGN_UP_ERRORS:
            code, detail = SIGN_UP_ERRORS[e.code]
            raise HTTPException(status_code=code, detail=detail)
        # Older Auth versions answered without an error code.
        if "already registered" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email_exists")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="registration_failed")

    if res.session is None:
        # Email confirmation is enabled for this project: the account was created
        # but there is no session yet until the user confirms via email.
        return None
    return _session_tokens(res.session, email)


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
    return _session_tokens(res.session, res.user.email)


def resend_confirmation(email: str) -> None:
    """Best effort: a caller must not learn whether the address has an unconfirmed account."""
    try:
        get_auth_client().auth.resend({"type": "signup", "email": email})
    except AuthApiError:
        pass


def sign_in(email: str, password: str) -> dict:
    try:
        res = get_auth_client().auth.sign_in_with_password({"email": email, "password": password})
    except AuthApiError as e:
        # Told apart from bad credentials so the UI can offer a new confirmation link.
        # Only reachable with a correct password, so it reveals nothing to a stranger.
        if e.code == EMAIL_NOT_CONFIRMED:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not confirmed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _session_tokens(res.session, email)


def refresh(refresh_token: str) -> dict:
    try:
        res = get_auth_client().auth.refresh_session(refresh_token)
    except AuthApiError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return _session_tokens(res.session, res.user.email)


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
