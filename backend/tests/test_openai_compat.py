import json
from datetime import date

import httpx
import pytest
import respx

from app.extract.openai_compat import OpenAICompatExtractor, parse_json_object

URL = "http://router.test/v1"
ANSWER = {
    "category": "scholarship",
    "summary_th": "ทุนสำหรับนักศึกษาปี 3",
    "deadline": "2026-11-20",
    "deadline_text": "20 พ.ย. 2569",
    "eligible_years": [3],
    "eligible_majors": ["cs", "not-a-major"],
    "min_gpax": 3.0,
}


def reply(content: str, model: str = "typhoon-v2.5") -> httpx.Response:
    return httpx.Response(
        200, json={"model": model, "choices": [{"message": {"content": content}}]}
    )


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    async def instant(_):
        return None

    monkeypatch.setattr("app.extract.openai_compat.asyncio.sleep", instant)


def test_parse_json_object_strips_fences_and_thinking() -> None:
    text = '<think>{"x": 1}</think>Here you go:\n```json\n{"deadline": null}\n```'
    assert parse_json_object(text) == {"deadline": None}
    with pytest.raises(ValueError):
        parse_json_object("ไม่มีวันปิดรับ")


@respx.mock
async def test_extract_records_serving_model_and_sanitizes() -> None:
    route = respx.post(f"{URL}/chat/completions").mock(
        return_value=reply("```json\n" + json.dumps(ANSWER, ensure_ascii=False) + "\n```")
    )
    r = await OpenAICompatExtractor(URL, "k", "typhoon").extract("t", "b", date(2026, 11, 4))
    assert r.deadline == date(2026, 11, 20)
    assert r.eligible_majors == ["cs"]
    assert r.method == "llm:typhoon-v2.5"
    sent = json.loads(route.calls[0].request.content)
    assert sent["model"] == "typhoon" and sent["temperature"] == 0


@respx.mock
async def test_rate_limit_retried_and_json_mode_dropped_when_rejected() -> None:
    route = respx.post(f"{URL}/chat/completions").mock(
        side_effect=[
            httpx.Response(429),
            httpx.Response(400, text="response_format not supported"),
            reply(json.dumps(ANSWER)),
        ]
    )
    r = await OpenAICompatExtractor(URL, "k", "m").extract("t", "b", date(2026, 11, 4))
    assert r.deadline == date(2026, 11, 20)
    assert "response_format" in json.loads(route.calls[0].request.content)
    assert "response_format" not in json.loads(route.calls[2].request.content)
