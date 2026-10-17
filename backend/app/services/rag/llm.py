import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger("syllabusiq.rag.llm")

# Once a Groq model is proven reachable for this API key, skip the failing ones.
_active_groq_model: Optional[str] = None


def strip_code_fences(text: str) -> str:
    """Remove markdown fences the model may wrap around a JSON payload."""
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def parse_json_payload(text: str) -> Optional[Any]:
    """Parse a JSON object/array out of an LLM response, tolerating fences and prose."""
    if not text:
        return None
    cleaned = strip_code_fences(text)
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass

    # Locate the first balanced JSON structure as a last resort.
    for opener, closer in (("{", "}"), ("[", "]")):
        start = cleaned.find(opener)
        end = cleaned.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except (json.JSONDecodeError, ValueError):
                continue
    return None


def _groq_complete(
    system: str,
    user: str,
    history: Optional[List[Dict[str, str]]],
    json_mode: bool,
    temperature: float,
    max_tokens: int,
) -> Optional[str]:
    global _active_groq_model
    if not settings.GROQ_API_KEY:
        return None

    from groq import Groq

    client = Groq(api_key=settings.GROQ_API_KEY)
    messages: List[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    for turn in (history or [])[-settings.MAX_CHAT_HISTORY_TURNS * 2 :]:
        role = turn.get("role")
        content = turn.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user})

    models = [m for m in ([_active_groq_model] if _active_groq_model else []) + settings.llm_model_list if m]
    seen = set()
    errors: List[str] = []
    for model in models:
        if model in seen:
            continue
        seen.add(model)
        kwargs: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        for attempt in range(2):
            try:
                response = client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content
                if content:
                    _active_groq_model = model
                    return content
                break
            except Exception as exc:  # noqa: BLE001 - provider errors vary widely
                message = str(exc)
                errors.append(f"{model}: {message}")
                logger.warning("Groq model %s failed: %s", model, message)
                # Some reasoning models reject max_tokens / response_format.
                if "max_tokens" in kwargs and ("max_tokens" in message or "max_completion_tokens" in message):
                    kwargs.pop("max_tokens", None)
                    continue
                if "response_format" in kwargs and "response_format" in message:
                    kwargs.pop("response_format", None)
                    continue
                break

    if errors:
        logger.warning("All Groq models failed: %s", "; ".join(errors))
    return None


def _gemini_complete(
    system: str,
    user: str,
    history: Optional[List[Dict[str, str]]],
    temperature: float,
    max_tokens: int,
) -> Optional[str]:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.LLM_MODEL)
        parts = [system] if system else []
        for turn in (history or [])[-settings.MAX_CHAT_HISTORY_TURNS * 2 :]:
            if turn.get("content"):
                parts.append(f"{turn.get('role')}: {turn['content']}")
        parts.append(user)
        response = model.generate_content(
            "\n\n".join(parts),
            generation_config={"temperature": temperature, "max_output_tokens": max_tokens},
        )
        return response.text.strip() if response.text else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini generation failed: %s", exc)
        return None


class LLM:
    """Single entry point for every LLM call in the platform (quiz authoring, doubt AI, rewrite)."""

    @classmethod
    async def complete(
        cls,
        system: str,
        user: str,
        history: Optional[List[Dict[str, str]]] = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        max_tokens: int = 1400,
    ) -> Optional[str]:
        try:
            result = await asyncio.to_thread(
                _groq_complete, system, user, history, json_mode, temperature, max_tokens
            )
            if result:
                return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq transport error: %s", exc)

        return await asyncio.to_thread(
            _gemini_complete, system, user, history, temperature, max_tokens
        )

    @classmethod
    async def complete_json(
        cls,
        system: str,
        user: str,
        temperature: float = 0.2,
        max_tokens: int = 2000,
    ) -> Optional[Any]:
        raw = await cls.complete(
            system=system,
            user=user,
            json_mode=True,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if not raw:
            return None
        parsed = parse_json_payload(raw)
        if parsed is None:
            # One retry without JSON mode in case the provider ignored response_format.
            raw2 = await cls.complete(
                system=system + "\nRespond with raw JSON only. No markdown fences.",
                user=user,
                json_mode=False,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            parsed = parse_json_payload(raw2 or "")
        return parsed
