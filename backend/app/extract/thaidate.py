"""Find dates in Thai and English announcement text, and pick the application deadline.

Handles Buddhist-era (พ.ศ.) and Common-era years, 2-digit years, Thai digits, abbreviated and
full month names, numeric dates and ranges such as "1 – 20 ต.ค. 2569" or "1 ก.ย. - 20 ต.ค. 69".
"""

import re
from dataclasses import dataclass
from datetime import date

THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")

# Longest names first so "ม.ค." does not match inside "มกราคม" partially, etc.
_MONTHS: dict[str, int] = {
    "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4, "พฤษภาคม": 5, "มิถุนายน": 6,
    "กรกฎาคม": 7, "สิงหาคม": 8, "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12,
    "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6,
    "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
    # Without the final dot, as people often type them
    "ม.ค": 1, "ก.พ": 2, "มี.ค": 3, "เม.ย": 4, "พ.ค": 5, "มิ.ย": 6,
    "ก.ค": 7, "ส.ค": 8, "ก.ย": 9, "ต.ค": 10, "พ.ย": 11, "ธ.ค": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6, "july": 7,
    "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9,
    "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}  # fmt: skip

_MONTH_RE = "|".join(re.escape(m) for m in sorted(_MONTHS, key=len, reverse=True))
_YEAR = r"(?:(?:พ\.?\s?ศ\.?|ค\.?\s?ศ\.?|B\.?E\.?|A\.?D\.?)\s*)?(?P<{name}>\d{{4}}|\d{{2}})(?!\d)"

# "20 ต.ค. 2569", "20 ตุลาคม พ.ศ. 2569", "1 – 20 ต.ค. 69", "20 October 2026", "20 ต.ค." (no year)
_DAY_MONTH = re.compile(
    r"(?<!\d)(?:(?P<d1>\d{1,2})\s*(?:[-–—]|ถึง|to)\s*)?(?P<d>\d{1,2})(?:st|nd|rd|th)?\s*"
    rf"(?P<m>{_MONTH_RE})(?![a-zก-๙])\.?,?\s*(?:" + _YEAR.format(name="y") + ")?",
    re.IGNORECASE,
)
# "October 20, 2026", "Oct 20 2026"
_EN_MONTH_RE = "|".join(sorted((m for m in _MONTHS if m.isascii()), key=len, reverse=True))
_MONTH_DAY = re.compile(
    rf"(?<![a-z])(?P<m>{_EN_MONTH_RE})\.?\s+(?P<d>\d{{1,2}})(?!\d)(?:st|nd|rd|th)?,?\s*"
    + _YEAR.format(name="y"),
    re.IGNORECASE,
)
# "20/10/2569", "20-10-26", "20.10.2026"
_NUMERIC = re.compile(
    r"(?<![\d/.-])(?P<d>\d{1,2})[/.-](?P<m>\d{1,2})[/.-](?P<y>\d{4}|\d{2})(?![\d/])"
)
# "2026-10-20"
_ISO = re.compile(r"(?<!\d)(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})(?!\d)")


@dataclass(frozen=True)
class FoundDate:
    value: date
    start: int
    end: int
    raw: str
    has_year: bool


def normalize(text: str) -> str:
    return text.translate(THAI_DIGITS).replace("\xa0", " ")


def resolve_year(raw: str | None, ref: date, month: int, day: int) -> int | None:
    """Turn a written year into a CE year, using the reference date to settle ambiguity."""
    if raw is None:
        # No year: pick the occurrence closest to the reference, allowing a little past.
        candidates = [ref.year - 1, ref.year, ref.year + 1]
        best = None
        for y in candidates:
            try:
                d = date(y, month, day)
            except ValueError:
                continue
            # Prefer dates from 2 months before the reference up to 10 months after it.
            delta = (d - ref).days
            score = abs(delta) if -60 <= delta <= 300 else 10_000 + abs(delta)
            if best is None or score < best[0]:
                best = (score, y)
        return best[1] if best else None
    y = int(raw)
    if len(raw) == 2:
        ce, be = 2000 + y, 2500 + y - 543
        return ce if abs(ce - ref.year) <= abs(be - ref.year) else be
    if y >= 2400:  # Buddhist era
        return y - 543
    return y


def _month_of(raw: str) -> int | None:
    if raw.isdigit():
        return int(raw)
    key = raw.lower()
    return _MONTHS.get(key) or _MONTHS.get(key.rstrip("."))


def _make(y: int | None, m: int, d: int) -> date | None:
    if y is None or not (1 <= m <= 12):
        return None
    try:
        return date(y, m, d)
    except ValueError:
        return None


def find_dates(text: str, ref: date) -> list[FoundDate]:
    """All dates in `text`, in document order. For a range, the end date is returned."""
    text = normalize(text)
    found: list[FoundDate] = []
    taken: list[tuple[int, int]] = []

    def overlaps(s: int, e: int) -> bool:
        return any(s < te and ts < e for ts, te in taken)

    for rx in (_ISO, _NUMERIC, _MONTH_DAY):
        for mt in rx.finditer(text):
            if overlaps(mt.start(), mt.end()):
                continue
            month = _month_of(mt.group("m"))
            if month is None:
                continue
            day = int(mt.group("d"))
            year = resolve_year(mt.group("y"), ref, month, day)
            if rx is _NUMERIC and year is not None and not 2000 <= year <= ref.year + 5:
                continue
            value = _make(year, month, day)
            if value:
                found.append(FoundDate(value, mt.start(), mt.end(), mt.group(0).strip(), True))
                taken.append((mt.start(), mt.end()))

    # Day-month forms. A range whose first part lacks a month ("1 ก.ย. - 20 ต.ค.") is two matches.
    for mt in _DAY_MONTH.finditer(text):
        if overlaps(mt.start(), mt.end()):
            continue
        month = _month_of(mt.group("m"))
        if month is None:
            continue
        day = int(mt.group("d"))
        y_raw = mt.group("y")
        # A trailing 2-digit number right after a month name is usually a year ("ต.ค. 69").
        year = resolve_year(y_raw, ref, month, day)
        value = _make(year, month, day)
        if value:
            found.append(
                FoundDate(value, mt.start(), mt.end(), mt.group(0).strip(), y_raw is not None)
            )
            taken.append((mt.start(), mt.end()))

    found.sort(key=lambda f: f.start)
    _fill_range_years(text, found)
    return found


def _fill_range_years(text: str, found: list[FoundDate]) -> None:
    """In "1 ก.ย. - 20 ต.ค. 2569" the first date has no year; borrow it from the next date."""
    for i, f in enumerate(found[:-1]):
        nxt = found[i + 1]
        if f.has_year or not nxt.has_year:
            continue
        between = text[f.end : nxt.start]
        if len(between) <= 12 and re.fullmatch(r"\s*(?:[-–—]|ถึง|to|until|จนถึง)?\s*", between):
            y = nxt.value.year if f.value.month <= nxt.value.month else nxt.value.year - 1
            fixed = _make(y, f.value.month, f.value.day)
            if fixed:
                found[i] = FoundDate(fixed, f.start, f.end, f.raw, True)


_STRONG = re.compile(
    r"(ปิดรับ|หมดเขต|ภายในวันที่|ภายใน|ก่อนวันที่|ไม่เกินวันที่|สิ้นสุด|วันสุดท้าย|ถึงวันที่|จนถึง|"
    r"deadline|closing date|apply by|due|no later than|closes?|until|last day)",
    re.IGNORECASE,
)
_APPLY = re.compile(
    r"(รับสมัคร|สมัคร|ส่งใบสมัคร|ยื่น|ส่งเอกสาร|ลงทะเบียน|register|apply|application|submit)", re.IGNORECASE
)
_NEGATIVE = re.compile(
    r"(ประกาศ\s*ณ|ประกาศเมื่อ|โพสต์|ประกาศผล|ประกาศรายชื่อ|สอบสัมภาษณ์|สัมภาษณ์|สอบข้อเขียน|"
    r"เริ่มปฏิบัติงาน|ระยะเวลาฝึก|ปฏิบัติงาน|เข้าร่วมกิจกรรม|จัดขึ้น|ณ ห้อง|ปฐมนิเทศ|"
    r"announce|interview|result|posted|published)",
    re.IGNORECASE,
)


# Between the two dates of a range, optionally with a time: "12 ต.ค. 2569 เวลา 08.30 น. ถึง 21 ต.ค."
_RANGE_SEP = re.compile(
    r"\s*(?:(?:เวลา\s*)?\d{1,2}[.:]\d{2}\s*(?:น\.)?\s*)?(?:[-–—]|ถึง|to|until|จนถึง)\s*(?:วันที่\s*)?"
)
# A date that only says when something opens: "เริ่มลงทะเบียน 23 มิ.ย. 2569 เป็นต้นไป"
_START_AFTER = re.compile(r"^\s*(?:เวลา[^\n]{0,15})?\s*(?:เป็นต้นไป|onwards)")
_START_BEFORE = re.compile(r"(เริ่ม|เปิดให้|starting|from)\s*\S{0,25}$", re.I)


@dataclass(frozen=True)
class Deadline:
    value: date
    raw: str
    score: int


def find_deadline(text: str, ref: date) -> Deadline | None:
    """Pick the date most likely to be the application deadline.

    Each date is scored by the words just before it on the same line: deadline words
    ("ปิดรับ", "ภายในวันที่"), application words ("รับสมัคร") and words that mark another kind
    of date (interview, results, event day) that lower the score.
    """
    norm = normalize(text)
    best: Deadline | None = None
    dates = find_dates(norm, ref)
    range_starts: set[int] = set()
    best_idx = -1
    for i, f in enumerate(dates):
        line_start = max(norm.rfind("\n", 0, f.start), 0)
        # For the end of "9 มีนาคม - 12 เมษายน", read the words before the whole range.
        anchor = f.start
        prev = dates[i - 1] if i else None
        if prev and _RANGE_SEP.fullmatch(norm[prev.end : f.start]):
            anchor = prev.start
            range_starts.add(i - 1)
        if anchor - line_start < 20 and line_start > 0:
            # "ตั้งแต่วันที่ 9 มี.ค. - ..." on its own line: the context is on the line above.
            line_start = max(norm.rfind("\n", 0, line_start - 1), 0)
        before = norm[max(line_start, anchor - 70) : anchor]
        # Application words may sit further back on the line ("สมัครทุน ทางลิงก์ <url> ตั้งแต่ ...").
        wide_before = norm[max(line_start, anchor - 120) : anchor]
        near_before = norm[max(line_start, anchor - 25) : anchor]
        score = 0
        if _STRONG.search(near_before):
            score += 6
        elif _STRONG.search(before):
            score += 4
        if _APPLY.search(before):
            score += 3
        elif _APPLY.search(wide_before):
            score += 1
        if anchor == f.start and (
            _START_AFTER.match(norm[f.end : f.end + 30]) or _START_BEFORE.search(near_before)
        ):
            score -= 5
        if _NEGATIVE.search(near_before):
            score -= 6
        elif _NEGATIVE.search(before):
            score -= 3
        is_range = anchor != f.start or bool(
            re.search(r"\d\s*(?:[-–—]|ถึง|to)\s*\d", f.raw)
            or re.search(r"(?:[-–—]|ถึง|to)\s*$", norm[max(0, f.start - 6) : f.start])
        )
        if is_range and (_APPLY.search(before) or "ตั้งแต่" in before or "ระหว่าง" in before):
            score += 2
        if score < 3:
            continue
        if best is None or score > best.score or (score == best.score and best_idx in range_starts):
            best = Deadline(f.value, f.raw, score)
            best_idx = i
    return best
