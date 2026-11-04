"""Rule-based extractor. Runs without any API key and is the baseline the LLM is measured against."""

import re
from datetime import date

from app.catalog import major_codes_in
from app.extract.schema import Extracted
from app.extract.thaidate import find_deadline, normalize
from app.models import Category

_KEYWORDS: dict[Category, list[str]] = {
    Category.SCHOLARSHIP: ["ทุนการศึกษา", "ทุน", "scholarship", "fellowship", "ทุนวิจัย"],
    Category.INTERNSHIP: ["สหกิจ", "ฝึกงาน", "co-op", "coop", "internship", "intern", "ฝึกประสบการณ์"],
    Category.JOB: ["รับสมัครงาน", "ตำแหน่งงาน", "รับสมัครพนักงาน", "ตำแหน่ง", "job", "hiring", "career", "recruit", "อัตราจ้าง", "ผู้ช่วยสอน", "ta "],
    Category.ACTIVITY: ["กิจกรรม", "อบรม", "workshop", "สัมมนา", "แข่งขัน", "hackathon", "ค่าย", "seminar", "บรรยาย", "competition", "talk"],
}  # fmt: skip

# Words that look like a category but are not ("ทุนพัฒนาการเรียนการสอน" is a teaching grant for staff).
_NOT_SCHOLARSHIP = re.compile(r"ทุนพัฒนาการเรียนการสอน|ทุนวิจัยสำหรับอาจารย์|ขอแสดงความยินดี")


def classify(title: str, body: str) -> Category:
    title_l, body_l = title.lower(), body.lower()
    scores: dict[Category, float] = {}
    for cat, words in _KEYWORDS.items():
        s = 0.0
        for w in words:
            s += 3 * title_l.count(w) + 0.5 * min(body_l.count(w), 4)
        scores[cat] = s
    if _NOT_SCHOLARSHIP.search(title):
        scores[Category.SCHOLARSHIP] = 0
    best = max(scores, key=lambda c: scores[c])
    return best if scores[best] >= 1.5 else Category.GENERAL


_YEAR_RANGE = re.compile(r"(?:ชั้นปีที่|ชั้นปี|ปีที่|ปี)\s*(\d)\s*(?:[-–]|ถึง|และ|,)\s*(?:ชั้นปีที่|ปีที่|ปี)?\s*(\d)")
_YEAR_UP = re.compile(r"(?:ชั้นปีที่|ชั้นปี|ปีที่)\s*(\d)\s*(?:ขึ้นไป|เป็นต้นไป)")
_YEAR_ONE = re.compile(r"(?:ชั้นปีที่|ชั้นปี)\s*(\d)(?!\d)")
_YEAR_EN = re.compile(
    r"(\d)(?:st|nd|rd|th)[\s-]*(?:and|or|-)?\s*(?:(\d)(?:st|nd|rd|th))?[\s-]*year", re.I
)
_GPAX = re.compile(
    r"(?:gpax|gpa|เกรดเฉลี่ย(?:สะสม)?|คะแนนเฉลี่ย(?:สะสม)?)\D{0,25}?([0-4]\.\d{1,2})", re.I
)


def eligible_years(text: str) -> list[int] | None:
    t = normalize(text)
    if m := _YEAR_UP.search(t):
        return list(range(int(m.group(1)), 5))
    if m := _YEAR_RANGE.search(t):
        a, b = sorted((int(m.group(1)), int(m.group(2))))
        if 1 <= a <= b <= 6:
            return list(range(a, b + 1))
    if m := _YEAR_EN.search(t):
        years = [int(g) for g in m.groups() if g]
        return sorted(set(years))
    years = sorted({int(m.group(1)) for m in _YEAR_ONE.finditer(t) if 1 <= int(m.group(1)) <= 6})
    return years or None


def min_gpax(text: str) -> float | None:
    m = _GPAX.search(normalize(text))
    return float(m.group(1)) if m else None


def qualification_section(text: str) -> str:
    """The part listing who may apply; majors are only read from here to avoid false matches."""
    m = re.search(r"(คุณสมบัติ|qualification|eligib|requirement|ผู้มีสิทธิ)", text, re.I)
    return text[m.start() : m.start() + 600] if m else ""


def summarize(title: str, body: str, max_chars: int = 220) -> str:
    sentences = [
        s.strip() for s in re.split(r"[\n。]|(?<=[.!?])\s+|\s{2,}", body) if len(s.strip()) > 15
    ]
    out = ""
    for s in sentences:
        if s == title.strip():
            continue
        if len(out) + len(s) > max_chars:
            break
        out = f"{out} {s}".strip()
    if not out:
        out = (body.strip() or title)[:max_chars]
    return out


def extract(title: str, body: str, ref: date) -> Extracted:
    text = f"{title}\n{body}"
    dl = find_deadline(text, ref)
    majors = major_codes_in(qualification_section(body))
    return Extracted(
        category=classify(title, body),
        summary_th=summarize(title, body),
        deadline=dl.value if dl else None,
        deadline_text=dl.raw if dl else None,
        eligible_years=eligible_years(qualification_section(body) or body[:1500]),
        eligible_majors=majors or None,
        min_gpax=min_gpax(body),
        method="rules",
    )
