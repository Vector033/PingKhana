from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.models import Category


class AnnouncementDetails(BaseModel):
    """Facts that depend on the category (a job's salary, an activity's venue). Each is null
    unless the post states it; the website shows only the ones that are set."""

    organization: str | None = None  # host company / institution
    target_group: str | None = None  # "ครูผู้ช่วย", "นักศึกษา ป.ตรี"
    event_date: str | None = None  # YYYY-MM-DD, or YYYY-MM-DD/YYYY-MM-DD for a range
    location: str | None = None  # venue, or "ออนไลน์"
    work_mode: Literal["onsite", "hybrid", "remote"] | None = None
    position: str | None = None
    employment_type: str | None = None  # "งานประจำ", "สัญญาจ้าง", "Part-time"
    education_level: str | None = None  # "ปริญญาตรีขึ้นไป"
    experience: str | None = None  # "ยินดีรับเด็กจบใหม่"
    compensation: str | None = None  # salary, stipend or scholarship amount
    fee: str | None = None  # "ฟรี" or the registration fee

    @field_validator("*", mode="before")
    @classmethod
    def _blank_is_none(cls, v):
        # Models answer "ไม่ระบุ" or "" for missing facts; the site must never show those.
        if isinstance(v, str):
            v = " ".join(v.split())[:160]
            if not v or v in ("-", "ไม่ระบุ", "ไม่มี", "null", "N/A", "n/a"):
                return None
        return v

    @field_validator("work_mode", mode="before")
    @classmethod
    def _known_mode(cls, v):
        return v if v in ("onsite", "hybrid", "remote") else None

    def compact(self) -> dict | None:
        """Only the facts that are set, or None, which is what gets stored."""
        return self.model_dump(exclude_none=True) or None


class Extracted(BaseModel):
    category: Category
    summary_th: str = Field(description="สรุปภาษาไทย 2-3 บรรทัด")
    deadline: date | None = None
    deadline_text: str | None = Field(None, description="ข้อความวันปิดรับตามต้นฉบับ")
    eligible_years: list[int] | None = Field(None, description="ชั้นปีที่สมัครได้ ว่างถ้าไม่จำกัด")
    eligible_majors: list[str] | None = Field(None, description="รหัสสาขาจากรายการที่ให้ ว่างถ้าไม่จำกัด")
    min_gpax: float | None = None
    tags: list[str] | None = Field(None, description="แท็กสั้นๆ 1-4 อัน")
    details: AnnouncementDetails | None = None
    method: str = "rules"


# JSON schema in the subset that Gemini's responseSchema accepts (OpenAPI 3.0 style).
GEMINI_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "category": {"type": "STRING", "enum": [c.value for c in Category]},
        "summary_th": {"type": "STRING"},
        "deadline": {"type": "STRING", "nullable": True, "description": "YYYY-MM-DD in CE"},
        "deadline_text": {"type": "STRING", "nullable": True},
        "eligible_years": {"type": "ARRAY", "items": {"type": "INTEGER"}, "nullable": True},
        "eligible_majors": {"type": "ARRAY", "items": {"type": "STRING"}, "nullable": True},
        "min_gpax": {"type": "NUMBER", "nullable": True},
        "tags": {"type": "ARRAY", "items": {"type": "STRING"}, "nullable": True},
        "details": {
            "type": "OBJECT",
            "nullable": True,
            "properties": {
                **{
                    k: {"type": "STRING", "nullable": True}
                    for k in (
                        "organization",
                        "target_group",
                        "location",
                        "position",
                        "employment_type",
                        "education_level",
                        "experience",
                        "compensation",
                        "fee",
                    )
                },
                "event_date": {
                    "type": "STRING",
                    "nullable": True,
                    "description": "YYYY-MM-DD in CE, or YYYY-MM-DD/YYYY-MM-DD for a range",
                },
                "work_mode": {
                    "type": "STRING",
                    "nullable": True,
                    "enum": ["onsite", "hybrid", "remote"],
                },
            },
        },
    },
    "required": ["category", "summary_th"],
}
