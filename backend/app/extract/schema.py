from datetime import date

from pydantic import BaseModel, Field

from app.models import Category


class Extracted(BaseModel):
    category: Category
    summary_th: str = Field(description="สรุปภาษาไทย 2-3 บรรทัด")
    deadline: date | None = None
    deadline_text: str | None = Field(None, description="ข้อความวันปิดรับตามต้นฉบับ")
    eligible_years: list[int] | None = Field(None, description="ชั้นปีที่สมัครได้ ว่างถ้าไม่จำกัด")
    eligible_majors: list[str] | None = Field(None, description="รหัสสาขาจากรายการที่ให้ ว่างถ้าไม่จำกัด")
    min_gpax: float | None = None
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
    },
    "required": ["category", "summary_th"],
}
