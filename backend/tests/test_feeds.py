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
    for sid in ("moe", "obec", "ksp"):
        cfg = SOURCES[sid]
        assert cfg.kind == "rss" and cfg.pack == "teacher" and cfg.homepage
    assert SOURCES["cs_cmu"].pack == "student"
    # Procurement reports in the คุรุสภา feed are skipped by category.
    assert any(
        any(s in c for c in i.categories for s in SOURCES["ksp"].skip_categories)
        for i in items("ksp")
    )
