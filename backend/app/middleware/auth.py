from fastapi import HTTPException, Request, status

from app.constants import ACCESS_TOKEN_COOKIE
from app.services.auth import get_user_from_token


def get_current_user(request: Request) -> dict:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_user_from_token(token)
