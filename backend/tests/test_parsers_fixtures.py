"""Parsers against real pages saved from each source (backend/tests/fixtures/html).

If a site changes its layout, re-save the fixtures and these tests show what broke.
"""

from datetime import date
from pathlib import Path

import pytest

from app.collector.parsers import parse_detail, parse_list
from app.collector.sources import load_sources
from app.extract import rules
from app.models import Category

FIXTURES = Path(__file__).parent / "fixtures" / "html"
TODAY = date(2026, 11, 4)
SOURCES = {s.id: s for s in load_sources()}


def html(name: str) -> str:
    return (FIXTURES / f"{name}.html").read_text(encoding="utf-8")


@pytest.mark.parametrize(
    ("sid", "count", "url_part", "has_dates"),
    [
        ("cs_cmu", 15, "https://www.cs.science.cmu.ac.th/20", True),
        ("sci_cmu", 8, "https://www.science.cmu.ac.th/2022/news-detail.php?id=", True),
        ("sdd_cmu", 20, "https://sdd.oop.cmu.ac.th/cmuNewsItem/", False),
        ("cmu_jobs", 20, "https://www.cmu.ac.th/th/article/", True),
        ("cmu_events", 20, "https://www.cmu.ac.th/th/article/", True),
    ],
)
def test_list_pages(sid: str, count: int, url_part: str, has_dates: bool) -> None:
    cfg = SOURCES[sid]
    items = parse_list(html(f"{sid}_list"), cfg, cfg.url, TODAY)
    assert len(items) == count
    assert all(i.url.startswith(url_part) for i in items)
    assert all(len(i.title) > 10 for i in items)
    # Every source shows a thumbnail per item; the card uses it.
    with_image = [i.image for i in items if i.image]
    assert len(with_image) >= count * 0.8
    assert all(u.startswith("https://") for u in with_image)
    assert len({i.url for i in items}) == count
    if has_dates:
        assert all(i.published_on and i.published_on <= TODAY for i in items)


def test_cs_dates_come_from_url_and_titles_are_thai() -> None:
    cfg = SOURCES["cs_cmu"]
    first = parse_list(html("cs_cmu_list"), cfg, cfg.url, TODAY)[0]
    assert first.published_on == date(2026, 8, 3)
    assert first.title.startswith("เปิดรับสมัครบุคคลเพื่อเข้าศึกษาต่อ")


@pytest.mark.parametrize(
    ("page", "title_start", "category", "deadline"),
    [
        ("cs_cmu_detail_1", "เปิดรับสมัครบุคคลเพื่อเข้าศึกษาต่อ", None, date(2026, 10, 8)),
        ("cs_cmu_detail_2", "ท้าประลองโค้ดดิ้ง", Category.ACTIVITY, date(2026, 7, 12)),
        ("sci_cmu_detail_1", "ขอเชิญชวนชาวคณะวิทยาศาสตร์", None, date(2026, 10, 29)),
        ("sdd_cmu_detail_1", "รับสมัครทุนการศึกษา มช.", Category.SCHOLARSHIP, date(2024, 4, 12)),
        ("cmu_jobs_detail_1", "CMUBS ขยายเวลารับสมัคร", Category.JOB, date(2026, 11, 30)),
        ("cmu_jobs_detail_2", "คณะทันตแพทยศาสตร์", Category.JOB, date(2026, 11, 16)),
        ("cmu_events_detail_2", "ขอเชิญผู้สนใจทุกท่าน", Category.ACTIVITY, None),
    ],
)
def test_detail_pages(
    page: str, title_start: str, category: Category | None, deadline: date | None
) -> None:
    sid = page.rsplit("_detail", 1)[0]
    d = parse_detail(html(page), SOURCES[sid], "fallback", TODAY)
    assert d.title.startswith(title_start)
    assert "– Computer Science" not in d.title
    assert len(d.text) > 200
    assert "<" not in d.text and "function(" not in d.text
    ref = d.published_on or (date(2024, 3, 1) if sid == "sdd_cmu" else TODAY)
    e = rules.extract(d.title, d.text, ref)
    assert e.deadline == deadline
    if category:
        assert e.category == category


def test_sdd_scholarship_eligibility() -> None:
    d = parse_detail(html("sdd_cmu_detail_1"), SOURCES["sdd_cmu"], "", TODAY)
    e = rules.extract(d.title, d.text, date(2024, 3, 1))
    assert e.eligible_years == [2, 3, 4]
