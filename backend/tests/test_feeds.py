"""Teacher-pack RSS feeds saved on 2026-11-09 (moe.go.th, obec.go.th, ksp.or.th)."""

from pathlib import Path

from app.collector.parsers import parse_list
from app.collector.sources import load_sources

FIXTURES = Path(__file__).parent / "fixtures" / "html"
SOURCES = {s.id: s for s in load_sources()}


def items(sid: str):
    cfg = SOURCES[sid]
    xml = (FIXTURES / f"{sid}_feed.xml").read_text(encoding="utf-8")
    return parse_list(xml, cfg, cfg.url, None)  # type: ignore[arg-type]


def test_moe_feed_with_blank_lines_before_xml_declaration_parses() -> None:
    got = items("moe")
    assert len(got) == 9
    assert all(i.url.startswith("https://www.moe.go.th/") for i in got)
    assert any("ข่าว ศธ. 360 องศา" in i.categories for i in got)


def test_feed_images_and_bodies() -> None:
    ksp = items("ksp")
    assert sum(1 for i in ksp if i.image) >= 8
    assert all(i.image.startswith("https://") for i in ksp if i.image)
    assert max(len(i.body) for i in ksp) > 1000
    obec = items("obec")
    assert sum(1 for i in obec if i.image) >= 7


def test_teacher_sources_are_in_the_teacher_pack() -> None:
    for sid in ("moe", "obec", "ksp", "kruachieve", "krupatom"):
        cfg = SOURCES[sid]
        assert cfg.kind == "rss" and cfg.pack == "teacher" and cfg.homepage
    assert SOURCES["cs_cmu"].pack == "student"
    # Procurement reports in the คุรุสภา feed are skipped by category.
    assert any(
        any(s in c for c in i.categories for s in SOURCES["ksp"].skip_categories)
        for i in items("ksp")
    )


def test_geo_blocked_feeds_are_off_in_production() -> None:
    assert not SOURCES["moe"].enabled and not SOURCES["ksp"].enabled
    assert SOURCES["obec"].enabled


def test_teacher_news_sites() -> None:
    assert len(items("kruachieve")) == 10
    krupatom = items("krupatom")
    assert len(krupatom) == 50 and all(i.body for i in krupatom)


def test_pdf_attachments() -> None:
    from datetime import date

    from app.collector.parsers import parse_detail

    with_pdf = [i for i in items("krupatom") if i.attachment]
    assert with_pdf
    assert all(
        i.attachment.lower().split("?")[0].endswith(".pdf")
        or i.attachment.startswith("https://drive.google.com/uc?export=download&id=")
        for i in with_pdf
    )
    # CMU pages link two PDFs in the site footer; only links inside the post count.
    cfg = SOURCES["cmu_jobs"]
    html = (FIXTURES / "cmu_jobs_detail_1.html").read_text(encoding="utf-8")
    d = parse_detail(html, cfg, "t", date(2026, 11, 4), "https://www.cmu.ac.th/th/article/x")
    assert d.attachment is None
