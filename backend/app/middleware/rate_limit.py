import time
from collections import defaultdict
from threading import Lock
from typing import Callable

from fastapi import HTTPException, Request, status

_hits: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def rate_limit(max_requests: int, window_seconds: int) -> Callable[[Request], None]:
    """Simple in-memory per-IP sliding-window rate limiter, scoped per route by path."""

    def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{request.url.path}:{client_ip}"
        now = time.monotonic()
        cutoff = now - window_seconds
        with _lock:
            hits = _hits[key]
            while hits and hits[0] < cutoff:
                hits.pop(0)
            if len(hits) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests, please try again later",
                )
            hits.append(now)

    return dependency
