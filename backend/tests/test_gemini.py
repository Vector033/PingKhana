import json
from datetime import date

import httpx
import pytest
import respx

from app.extract.gemini import API, GeminiExtractor

ANSWER = {
    "category": "scholarship",
    "summary_th": "ทุนสำหรับนักศึกษาปี 3",
    "deadline": "2026-11-20",
    "deadline_text": "20 พ.ย. 2569",
    "eligible_years": [3],
    "eligible_majors": None,
    "min_gpax": 3.0,
}


def ok() -> httpx.Response:
    return httpx.Response(
        200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(ANSWER)}]}}]}
    )


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    async def instant(_):
        return None

    monkeypatch.setattr("app.extract.gemini.asyncio.sleep", instant)


@respx.mock
async def test_overloaded_model_falls_back_to_next():
    busy = respx.post(API.format(model="main")).mock(return_value=httpx.Response(503))
    spare = respx.post(API.format(model="spare")).mock(return_value=ok())
    async with httpx.AsyncClient() as client:
        r = await GeminiExtractor("k", "main", client, ("spare",)).extract(
            "t", "b", date(2026, 11, 4)
        )
    assert busy.call_count == 2
    assert spare.call_count == 1
    assert r.method == "gemini:spare"
    assert r.deadline == date(2026, 11, 20)


@respx.mock
async def test_timeout_is_retried_and_bad_request_is_not():
    route = respx.post(API.format(model="main")).mock(side_effect=[httpx.ReadTimeout("slow"), ok()])
    async with httpx.AsyncClient() as client:
        r = await GeminiExtractor("k", "main", client).extract("t", "b", date(2026, 11, 4))
    assert route.call_count == 2 and r.method == "gemini:main"

    respx.post(API.format(model="bad")).mock(return_value=httpx.Response(400))
    async with httpx.AsyncClient() as client:
        with pytest.raises(httpx.HTTPStatusError):
            await GeminiExtractor("k", "bad", client, ("spare",)).extract(
                "t", "b", date(2026, 11, 4)
            )


@respx.mock
async def test_poster_is_sent_inline_and_marked() -> None:
    route = respx.post(API.format(model="m")).mock(return_value=ok())
    ex = GeminiExtractor("k", "m")
    r = await ex.extract("t", "b", date(2026, 11, 4), (b"PNG-bytes", "image/png"))
    parts = json.loads(route.calls[0].request.content)["contents"][0]["parts"]
    assert parts[-1]["inline_data"]["mime_type"] == "image/png"
    assert r.method == "gemini:m+poster"


@respx.mock
async def test_pdf_is_sent_inline_and_marked() -> None:
    route = respx.post(API.format(model="m")).mock(return_value=ok())
    r = await GeminiExtractor("k", "m").extract("t", "b", date(2026, 11, 4), pdf=b"%PDF-1.4")
    parts = json.loads(route.calls[0].request.content)["contents"][0]["parts"]
    assert parts[-1]["inline_data"]["mime_type"] == "application/pdf"
    assert r.method == "gemini:m+pdf"
