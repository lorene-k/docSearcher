from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.constants import ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_MAX_AGE
from app.middleware.rate_limit import rate_limit
from app.services.auth import refresh, sign_in, sign_up

auth_router = APIRouter(prefix="/auth")

COOKIE_KWARGS = {"httponly": True, "secure": settings.cookie_secure, "samesite": "none", "path": "/"}


class AuthInput(BaseModel):
    email: EmailStr
    password: str


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
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path="/")
    return {"message": "logged out"}
