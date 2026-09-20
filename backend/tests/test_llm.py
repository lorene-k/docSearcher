"""Tests for provider fallback, including answers that come back empty."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.llm import GeminiProvider, GroqProvider, generate_with_fallback, require_text


class TestRequireText:
    @pytest.mark.parametrize("text", [None, "", "   "], ids=["none", "empty", "whitespace"])
    def test_an_empty_answer_is_a_failure(self, text):
        with pytest.raises(RuntimeError, match="empty answer"):
            require_text(text, "Gemini")

    def test_real_text_passes_through(self):
        assert require_text("an answer", "Gemini") == "an answer"


class TestProvidersRejectEmptyAnswers:
    def test_gemini_blocked_response_raises(self):
        response = MagicMock(text=None)
        with patch("app.services.llm.get_google_client") as google:
            google.return_value.models.generate_content.return_value = response
            with pytest.raises(RuntimeError):
                GeminiProvider().generate("prompt")

    def test_groq_empty_completion_raises(self):
        response = MagicMock(choices=[MagicMock(message=MagicMock(content=""))])
        with patch("app.services.llm.get_groq_client") as groq:
            groq.return_value.chat.completions.create.return_value = response
            with pytest.raises(RuntimeError):
                GroqProvider().generate("prompt")


class TestFallback:
    def test_an_empty_gemini_answer_falls_through_to_groq(self):
        with (
            patch.object(GeminiProvider, "generate", side_effect=RuntimeError("Gemini returned an empty answer")),
            patch.object(GroqProvider, "generate", return_value="fallback answer") as groq,
            patch("app.services.llm.settings.groq_api_key", "set"),
        ):
            assert generate_with_fallback("prompt") == "fallback answer"
        groq.assert_called_once_with("prompt")

    def test_both_empty_raises_so_the_caller_answers_503(self):
        with (
            patch.object(GeminiProvider, "generate", side_effect=RuntimeError("empty")),
            patch.object(GroqProvider, "generate", side_effect=RuntimeError("empty")),
            patch("app.services.llm.settings.groq_api_key", "set"),
            pytest.raises(RuntimeError, match="All LLM providers failed"),
        ):
            generate_with_fallback("prompt")
