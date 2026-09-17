"""
LLM abstraction with Google Gemini as primary and Groq as fallback.
Auto-retries on 503/429, then switches provider.
"""

import logging
from abc import ABC, abstractmethod

from app.config import settings
from app.constants import GENERATION_MODEL, GROQ_FALLBACK_MODEL, MAX_OUTPUT_TOKENS

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str) -> str: ...


class GeminiProvider(LLMProvider):
    def generate(self, prompt: str) -> str:
        from app.services.google_client import get_client

        client = get_client()
        response = client.models.generate_content(
            model=GENERATION_MODEL,
            contents=prompt,
            config={"max_output_tokens": MAX_OUTPUT_TOKENS},
        )
        return response.text


class GroqProvider(LLMProvider):
    _client = None

    def _get_client(self):
        if self.__class__._client is None:
            from groq import Groq

            self.__class__._client = Groq(api_key=settings.groq_api_key)
        return self.__class__._client

    def generate(self, prompt: str) -> str:
        client = self._get_client()
        response = client.chat.completions.create(
            model=GROQ_FALLBACK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=MAX_OUTPUT_TOKENS,
        )
        return response.choices[0].message.content


def generate_with_fallback(prompt: str) -> str:
    """Try Gemini first; fall back to Groq on any exception if GROQ_API_KEY is set."""
    providers: list[LLMProvider] = [GeminiProvider()]
    if settings.groq_api_key:
        providers.append(GroqProvider())

    last_exc: Exception | None = None
    for provider in providers:
        try:
            return provider.generate(prompt)
        except Exception as exc: # noqa: BLE001 (provider fallback loop, must catch anything)
            logger.warning("LLM provider %s failed: %s", type(provider).__name__, exc)
            last_exc = exc

    raise RuntimeError(f"All LLM providers failed. Last error: {last_exc}")
