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


# One realistic answer per category, as Gemini returns it (with the noise it sometimes adds).
DETAIL_CASES = {
    "scholarship": (
        {"target_group": "นักศึกษา ป.ตรี ปี 2-4", "compensation": "40,000 บาท/ปี", "fee": "ไม่ระบุ"},
        {"target_group": "นักศึกษา ป.ตรี ปี 2-4", "compensation": "40,000 บาท/ปี"},
    ),
    "internship": (
        {
            "organization": "SCB TechX",
            "work_mode": "hybrid",
            "location": "กรุงเทพฯ",
            "compensation": "เบี้ยเลี้ยงวันละ 500 บาท",
        },
        {
            "organization": "SCB TechX",
            "work_mode": "hybrid",
            "location": "กรุงเทพฯ",
            "compensation": "เบี้ยเลี้ยงวันละ 500 บาท",
        },
    ),
    "job": (
        {
            "organization": "คณะทันตแพทยศาสตร์ มช.",
            "position": "ผู้ปฏิบัติงานทันตกรรม",
            "employment_type": "พนักงานมหาวิทยาลัย",
            "education_level": "ม.6 หรือ ปวช.",
            "experience": "-",
            "compensation": "11,740 บาท",
            "work_mode": "office",
        },
        {
            "organization": "คณะทันตแพทยศาสตร์ มช.",
            "position": "ผู้ปฏิบัติงานทันตกรรม",
            "employment_type": "พนักงานมหาวิทยาลัย",
            "education_level": "ม.6 หรือ ปวช.",
            "compensation": "11,740 บาท",
        },
    ),
    "activity": (
        {
            "event_date": "2026-12-09",
            "location": "ออนไลน์ผ่าน Zoom",
            "target_group": "ครูผู้ช่วย",
            "fee": "ฟรี",
            "position": "",
        },
        {
            "event_date": "2026-12-09",
            "location": "ออนไลน์ผ่าน Zoom",
            "target_group": "ครูผู้ช่วย",
            "fee": "ฟรี",
        },
    ),
    "general": (
        {"organization": "สพฐ.", "event_date": None},
        {"organization": "สพฐ."},
    ),
}


@pytest.mark.parametrize("category", list(DETAIL_CASES))
@respx.mock
async def test_category_details_are_kept_and_placeholders_dropped(category):
    from app.extract.service import apply
    from app.models import Announcement

    raw, expected = DETAIL_CASES[category]
    answer = {**ANSWER, "category": category, "deadline": None, "details": raw}
    respx.post(API.format(model="main")).mock(
        return_value=httpx.Response(
            200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(answer)}]}}]}
        )
    )
    async with httpx.AsyncClient() as client:
        r = await GeminiExtractor("k", "main", client).extract("t", "b", date(2026, 11, 20))
    assert r.details is not None and r.details.compact() == expected
    a = Announcement()
    apply(a, r)
    assert a.details == expected


@respx.mock
async def test_answer_without_details_stores_none():
    respx.post(API.format(model="main")).mock(return_value=ok())
    async with httpx.AsyncClient() as client:
        r = await GeminiExtractor("k", "main", client).extract("t", "b", date(2026, 11, 4))
    assert r.details is None


def test_all_empty_details_compact_to_none():
    from app.extract.schema import AnnouncementDetails

    assert AnnouncementDetails(fee="ไม่ระบุ", location="  ").compact() is None


def test_prompt_separates_event_date_from_deadline():
    from app.extract.gemini import PROMPT
    from app.extract.schema import GEMINI_RESPONSE_SCHEMA

    assert "event_date" in PROMPT and "deadline เป็น null" in PROMPT
    assert "event_date" in GEMINI_RESPONSE_SCHEMA["properties"]["details"]["properties"]
