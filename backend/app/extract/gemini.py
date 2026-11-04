"""Gemini extractor with a JSON response schema. Used when GEMINI_API_KEY is set."""

import asyncio
import json
import logging
from datetime import date

import httpx

from app.catalog import MAJORS
from app.extract.schema import GEMINI_RESPONSE_SCHEMA, Extracted

log = logging.getLogger(__name__)

API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

PROMPT = """คุณช่วยสรุปประกาศจากเว็บไซต์มหาวิทยาลัยเชียงใหม่ให้นักศึกษา
วันนี้คือ {today} (ค.ศ.) ประกาศนี้เผยแพร่เมื่อ {published}

ตอบเป็น JSON ตาม schema:
- category: scholarship=ทุนสำหรับนักศึกษา, internship=สหกิจ/ฝึกงาน, job=รับสมัครงาน/ผู้ช่วย,
  activity=กิจกรรม/อบรม/แข่งขัน, general=อื่นๆ (รวมข่าวแสดงความยินดี ประชาสัมพันธ์ทั่วไป)
- summary_th: สรุปภาษาไทย 2-3 บรรทัด ไม่เกิน 220 ตัวอักษร บอกว่าเป็นอะไร ใครสมัครได้ ได้อะไร
- deadline: วันปิดรับสมัคร/วันสุดท้ายที่ต้องส่ง เป็น YYYY-MM-DD ปี ค.ศ. (แปลง พ.ศ. ลบ 543)
  ถ้าเป็นช่วงวันที่ให้ใช้วันสุดท้าย ถ้าไม่มีวันปิดรับชัดเจนให้เป็น null ห้ามเดา
  ห้ามใช้วันประกาศ วันสัมภาษณ์ วันประกาศผล หรือวันจัดกิจกรรม เป็นวันปิดรับ
- deadline_text: ข้อความวันที่ตามต้นฉบับ
- eligible_years: ชั้นปีที่สมัครได้ เช่น [3,4] หรือ null ถ้าไม่จำกัด
- eligible_majors: รหัสสาขาจากรายการนี้เท่านั้น {majors} หรือ null ถ้าไม่จำกัดสาขา
- min_gpax: GPAX ขั้นต่ำ หรือ null

หัวข้อ: {title}
เนื้อหา:
{body}
"""


class GeminiExtractor:
    def __init__(self, api_key: str, model: str, client: httpx.AsyncClient | None = None):
        self.api_key = api_key
        self.model = model
        self.client = client or httpx.AsyncClient(timeout=60)

    async def extract(self, title: str, body: str, ref: date) -> Extracted:
        prompt = PROMPT.format(
            today=date.today().isoformat(),
            published=ref.isoformat(),
            majors=", ".join(k for k in MAJORS if k != "other"),
            title=title,
            body=body[:6000],
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
                "responseSchema": GEMINI_RESPONSE_SCHEMA,
            },
        }
        data = await self._post(payload)
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        raw = json.loads(text)
        result = Extracted.model_validate({**raw, "method": f"gemini:{self.model}"})
        return _sanity(result, ref)

    async def _post(self, payload: dict) -> dict:
        delay = 2.0
        for attempt in range(4):
            resp = await self.client.post(
                API.format(model=self.model),
                headers={"x-goog-api-key": self.api_key},
                json=payload,
            )
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < 3:
                log.warning("gemini %s, retrying in %.0fs", resp.status_code, delay)
                await asyncio.sleep(delay)
                delay *= 2
                continue
            resp.raise_for_status()
        raise RuntimeError("unreachable")


def _sanity(r: Extracted, ref: date) -> Extracted:
    """Drop values the model sometimes invents: far-away deadlines, unknown majors, GPAX > 4."""
    if r.deadline and not (-400 <= (r.deadline - ref).days <= 730):
        r.deadline = None
        r.deadline_text = None
    if r.eligible_majors:
        r.eligible_majors = [m for m in r.eligible_majors if m in MAJORS] or None
    if r.eligible_years:
        r.eligible_years = sorted({y for y in r.eligible_years if 1 <= y <= 6}) or None
    if r.min_gpax is not None and not 0 < r.min_gpax <= 4:
        r.min_gpax = None
    return r
