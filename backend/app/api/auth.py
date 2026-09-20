from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.constants import ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_MAX_AGE
from app.middleware.rate_limit import rate_limit
from app.services.auth import confirm_email, refresh, resend_confirmation, sign_in, sign_up

auth_router = APIRouter(prefix="/auth")


def build_cookie_kwargs(secure: bool) -> dict:
    """Browsers drop a SameSite=none cookie that is not Secure, and report nothing,
    so the two move together instead of being configured independently."""
    return {"httponly": True, "secure": secure, "samesite": "none" if secure else "lax", "path": "/"}


COOKIE_KWARGS = build_cookie_kwargs(settings.cookie_secure)


class AuthInput(BaseModel):
    email: EmailStr
    password: str


class ConfirmInput(BaseModel):
    token_hash: str = Field(min_length=1, max_length=512)
    type: Literal["email", "signup"]


class ResendInput(BaseModel):
    email: EmailStr


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str, access_max_age: int) -> None:
    response.set_cookie(ACCESS_TOKEN_COOKIE, access_token, max_age=access_max_age, **COOKIE_KWARGS)
    response.set_cookie(REFRESH_TOKEN_COOKIE, refresh_token, max_age=REFRESH_TOKEN_MAX_AGE, **COOKIE_KWARGS)


@auth_router.post("/register", status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit(5, 60))])
def register(body: AuthInput, response: Response) -> dict:
    tokens = sign_up(body.email, body.password)
    if tokens is None:
        response.status_code = status.HTTP_202_ACCEPTED
        return {
            "status": "confirmation_required",
            "message": "Check your email to confirm your account before logging in.",
        }
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"], tokens["expires_in"])
    return {"email": tokens["email"]}


@auth_router.post("/confirm", dependencies=[Depends(rate_limit(10, 60))])
def confirm(body: ConfirmInput, response: Response) -> dict:
    tokens = confirm_email(body.token_hash, body.type)
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"], tokens["expires_in"])
    return {"email": tokens["email"]}


@auth_router.post("/resend", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(rate_limit(3, 60))])
def resend(body: ResendInput) -> dict:
    # Always accepted, so the response never says whether the address has an account.
    resend_confirmation(body.email)
    return {
        "status": "confirmation_sent",
        "message": "If that address needs confirming, a new link is on its way.",
    }


@auth_router.post("/login", dependencies=[Depends(rate_limit(10, 60))])
def login(body: AuthInput, response: Response) -> dict:
    tokens = sign_in(body.email, body.password)
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"], tokens["expires_in"])
    return {"email": tokens["email"]}


@auth_router.post("/refresh")
def refresh_route(request: Request, response: Response) -> dict:
    refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    tokens = refresh(refresh_token)
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"], tokens["expires_in"])
    return {"message": "refreshed"}


@auth_router.post("/logout")
def logout(response: Response) -> dict:
    # Same attributes as when set, or a cross-site browser ignores the deletion
    response.delete_cookie(ACCESS_TOKEN_COOKIE, **COOKIE_KWARGS)
    response.delete_cookie(REFRESH_TOKEN_COOKIE, **COOKIE_KWARGS)
    return {"message": "logged out"}
