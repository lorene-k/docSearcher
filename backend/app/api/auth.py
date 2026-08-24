from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.constants import ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE
from app.services.auth import refresh, sign_in, sign_up

auth_router = APIRouter(prefix="/auth")

COOKIE_KWARGS = {"httponly": True, "secure": settings.cookie_secure, "samesite": "none", "path": "/"}


class AuthInput(BaseModel):
    email: EmailStr
    password: str


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(ACCESS_TOKEN_COOKIE, access_token, **COOKIE_KWARGS)
    response.set_cookie(REFRESH_TOKEN_COOKIE, refresh_token, **COOKIE_KWARGS)


@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: AuthInput, response: Response) -> dict:
    tokens = sign_up(body.email, body.password)
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    return {"email": tokens["email"]}


@auth_router.post("/login")
def login(body: AuthInput, response: Response) -> dict:
    tokens = sign_in(body.email, body.password)
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    return {"email": tokens["email"]}


@auth_router.post("/refresh")
def refresh_route(request: Request, response: Response) -> dict:
    refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    tokens = refresh(refresh_token)
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    return {"message": "refreshed"}


@auth_router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path="/")
    return {"message": "logged out"}
