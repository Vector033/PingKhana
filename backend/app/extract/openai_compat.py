"""Extractor for any OpenAI-compatible chat endpoint, with the same prompt as Gemini.

Used by the eval to compare models through FreeLLMAPI (a local router over free LLM tiers at
http://127.0.0.1:31415/v1). Production stays on Gemini: Render cannot reach a local router.
"""

import asyncio
import json
import logging
import re
from datetime import date

import httpx

from app.catalog import MAJORS
from app.extract.gemini import PROMPT, RETRY_STATUS, _sanity
from app.extract.schema import Extracted

log = logging.getLogger(__name__)

JSON_ONLY = (
    "\nตอบเป็น JSON object เดียวเท่านั้น ไม่ต้องมีคำอธิบาย ใช้ key: category, summary_th, deadline,"
    " deadline_text, eligible_years, eligible_majors, min_gpax"
)


def parse_json_object(text: str) -> dict:
    """Models without a JSON mode wrap the object in prose or ``` fences; take the outermost {...}."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError(f"no JSON object in reply: {text[:80]!r}")
    return json.loads(text[start : end + 1])


class OpenAICompatExtractor:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        client: httpx.AsyncClient | None = None,
        json_mode: bool = True,
        attempts: int = 4,
    ):
        self.url = base_url.rstrip("/") + "/chat/completions"
        self.api_key = api_key
        self.model = model
        self.json_mode = json_mode
        # Free tiers answer 429 with a cooldown of up to a minute; evals pass a higher number.
        self.attempts = attempts
        self.client = client or httpx.AsyncClient(timeout=180)

    async def extract(self, title: str, body: str, ref: date) -> Extracted:
        prompt = PROMPT.format(
            today=date.today().isoformat(),
            published=ref.isoformat(),
            majors=", ".join(k for k in MAJORS if k != "other"),
            title=title,
            body=body[:6000],
        )
        payload: dict = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt + JSON_ONLY}],
            "temperature": 0,
        }
        if self.json_mode:
            payload["response_format"] = {"type": "json_object"}
        data = await self._post(payload)
        served_by = data.get("model") or self.model
        raw = parse_json_object(data["choices"][0]["message"].get("content") or "")
        result = Extracted.model_validate({**raw, "method": f"llm:{served_by}"})
        return _sanity(result, ref)

    async def _post(self, payload: dict) -> dict:
        delay = 5.0
        for attempt in range(self.attempts):
            try:
                resp = await self.client.post(
                    self.url, headers={"Authorization": f"Bearer {self.api_key}"}, json=payload
                )
            except httpx.TransportError as e:
                last: Exception = e
            else:
                if resp.status_code == 200:
                    return resp.json()
                last = httpx.HTTPStatusError(
                    f"{self.model} {resp.status_code}: {resp.text[:160]}",
                    request=resp.request,
                    response=resp,
                )
                # Some providers reject response_format; retry once without it.
                if resp.status_code == 400 and "response_format" in payload:
                    payload = {k: v for k, v in payload.items() if k != "response_format"}
                    continue
                if resp.status_code not in RETRY_STATUS:
                    raise last
            if attempt < self.attempts - 1:
                log.warning("%s: %s, retrying in %.0fs", self.model, str(last)[:120], delay)
                await asyncio.sleep(delay)
                delay = min(delay * 2, 60.0)
        raise last
