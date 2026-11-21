"""Gemini extractor with a JSON response schema. Used when GEMINI_API_KEY is set."""

import asyncio
import base64
import json
import logging
import re
from datetime import date

import httpx

from app.catalog import MAJORS
from app.extract.schema import GEMINI_RESPONSE_SCHEMA, Extracted

log = logging.getLogger(__name__)

API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

PROMPT = """คุณช่วยสรุปประกาศจากเว็บไซต์มหาวิทยาลัยและหน่วยงานการศึกษา ให้นักศึกษา ครู และคนหางาน
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
- tags: แท็กภาษาไทยสั้นๆ 1-4 อัน บอกเรื่องหลักที่คนจะค้นหา เช่น ทุนต่างประเทศ, สอบครูผู้ช่วย, อบรมออนไลน์ฟรี
  ใช้แท็กจากรายการนี้ก่อนถ้าตรง: {known_tags}
  สร้างแท็กใหม่เฉพาะเมื่อไม่มีอันไหนตรง ไม่ใส่ชื่อหน่วยงาน วันที่ หรือ #
- details: ข้อมูลตามประเภทประกาศ ใส่เฉพาะที่ประกาศหรือโปสเตอร์เขียนไว้จริง ที่ไม่มีให้เป็น null
  ห้ามเดา ห้ามใส่ "ไม่ระบุ" หรือ "-"
  organization=บริษัท/หน่วยงานที่รับสมัครหรือจัด, target_group=ใครสมัครได้ เช่น ครูผู้ช่วย นักศึกษา ป.ตรี,
  event_date=วันจัดกิจกรรม/อบรม/สอบ เป็น YYYY-MM-DD ปี ค.ศ. ถ้าหลายวันให้เป็น YYYY-MM-DD/YYYY-MM-DD,
  location=สถานที่ หรือ ออนไลน์, work_mode=onsite/hybrid/remote (เฉพาะงานและฝึกงาน),
  position=ชื่อตำแหน่ง, employment_type=ประเภทการจ้าง เช่น งานประจำ สัญญาจ้าง Part-time,
  education_level=วุฒิที่ต้องการ, experience=ประสบการณ์ที่ต้องการ,
  compensation=เงินเดือน เบี้ยเลี้ยง หรือมูลค่าทุน ตามที่เขียน, fee=ค่าสมัคร/ค่าลงทะเบียน หรือ ฟรี
  วันจัดกิจกรรมใส่ที่ details.event_date ไม่ใช่ deadline: ถ้าประกาศแค่ว่า "จัดกิจกรรมวันที่ 9 ธ.ค."
  ให้ event_date เป็นวันนั้นและ deadline เป็น null ใส่ deadline เฉพาะเมื่อมีวันปิดรับสมัคร/ลงทะเบียนเขียนไว้

หัวข้อ: {title}
เนื้อหา:
{body}
"""


POSTER_NOTE = (
    "แนบรูปโปสเตอร์ของประกาศนี้มาด้วย ถ้าในรูปมีวันปิดรับสมัคร คุณสมบัติ หรือรายละเอียดที่เนื้อหาไม่มี"
    " ให้ใช้ข้อมูลจากรูปด้วย แต่ถ้ารูปกับเนื้อหาขัดกัน ให้เชื่อเนื้อหา"
)

PDF_NOTE = (
    "แนบไฟล์ PDF ประกาศฉบับเต็มมาด้วย ใช้หาวันปิดรับสมัครและคุณสมบัติ (ระวังสับสนกับวันประกาศผล วันสอบ หรือวันสัมภาษณ์)"
)

RETRY_STATUS = (429, 500, 502, 503, 504)


class GeminiExtractor:
    def __init__(
        self,
        api_key: str,
        model: str,
        client: httpx.AsyncClient | None = None,
        fallback_models: tuple[str, ...] = (),
    ):
        self.api_key = api_key
        self.model = model
        # Tried in order when the main model stays overloaded (503) or is retired (404).
        self.models = (model, *(m for m in fallback_models if m != model))
        self.client = client or httpx.AsyncClient(timeout=120)

    async def extract(
        self,
        title: str,
        body: str,
        ref: date,
        poster: tuple[bytes, str] | None = None,
        known_tags: list[str] | None = None,
        pdf: bytes | None = None,
    ) -> Extracted:
        """`poster` is (image bytes, mime type): many posts put the closing date only on it."""
        prompt = PROMPT.format(
            today=date.today().isoformat(),
            published=ref.isoformat(),
            majors=", ".join(k for k in MAJORS if k != "other"),
            title=title,
            body=body[:6000],
            known_tags=", ".join(known_tags or []) or "(ยังไม่มี)",
        )
        parts: list[dict] = [{"text": prompt}]
        if poster:
            parts.append({"text": POSTER_NOTE})
            parts.append(
                {
                    "inline_data": {
                        "mime_type": poster[1],
                        "data": base64.b64encode(poster[0]).decode(),
                    }
                }
            )
        if pdf:
            parts.append({"text": PDF_NOTE})
            parts.append(
                {
                    "inline_data": {
                        "mime_type": "application/pdf",
                        "data": base64.b64encode(pdf).decode(),
                    }
                }
            )
        payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
                "responseSchema": GEMINI_RESPONSE_SCHEMA,
            },
        }
        # A PDF or poster takes Gemini longer to read than the per-request default.
        model, data = await self._post(payload, request_timeout=75.0 if (pdf or poster) else None)
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        raw = json.loads(text)
        method = f"gemini:{model}" + ("+poster" if poster else "") + ("+pdf" if pdf else "")
        result = Extracted.model_validate({**raw, "method": method})
        return _sanity(result, ref)

    async def ask_json(self, prompt: str, schema: dict) -> dict:
        """Any structured question (used by source discovery), same fallbacks and retries."""
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
                "responseSchema": schema,
            },
        }
        _, data = await self._post(payload)
        return json.loads(data["candidates"][0]["content"]["parts"][0]["text"])

    async def _post(self, payload: dict, request_timeout: float | None = None) -> tuple[str, dict]:
        last: Exception | None = None
        for i, model in enumerate(self.models):
            last_model = i == len(self.models) - 1
            delay = 2.0
            attempts = 4 if last_model else 2
            for attempt in range(attempts):
                try:
                    resp = await self.client.post(
                        API.format(model=model),
                        headers={"x-goog-api-key": self.api_key},
                        json=payload,
                        timeout=request_timeout
                        if request_timeout is not None
                        else httpx.USE_CLIENT_DEFAULT,
                    )
                except httpx.TransportError as e:  # includes timeouts
                    last = e
                    log.warning("gemini %s: %r, retrying in %.0fs", model, e, delay)
                else:
                    if resp.status_code == 200:
                        return model, resp.json()
                    last = httpx.HTTPStatusError(
                        f"gemini {model} {resp.status_code}", request=resp.request, response=resp
                    )
                    if resp.status_code == 404:
                        break
                    if resp.status_code not in RETRY_STATUS:
                        raise last
                    log.warning("gemini %s %s, retrying in %.0fs", model, resp.status_code, delay)
                if attempt < attempts - 1:
                    await asyncio.sleep(delay)
                    delay *= 2
            if not last_model:
                log.warning("gemini %s unavailable, trying %s", model, self.models[i + 1])
        assert last is not None
        raise last


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
    r.tags = clean_tags(r.tags)
    return r


def clean_tags(tags: list[str] | None) -> list[str] | None:
    """Short, deduplicated tags: no '#', no spaces at the ends, Latin lower-cased, at most 4."""
    out: list[str] = []
    for t in tags or []:
        t = re.sub(r"\s+", " ", t.replace("#", "")).strip(" .,-")
        t = t.lower() if t.isascii() else t
        if 2 <= len(t) <= 32 and t not in out:
            out.append(t)
    return out[:4] or None
