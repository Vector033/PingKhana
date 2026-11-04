from datetime import timedelta

import httpx
import respx
from sqlalchemy import func, select

from app.collector.fetcher import PoliteFetcher
from app.collector.pipeline import collect_source, sync_sources
from app.collector.sources import SourceConfig
from app.models import Announcement, FetchRun, Source
from tests.factories import NOW

BASE = "https://news.example.ac.th"
CFG = SourceConfig.model_validate(
    {
        "id": "demo",
        "name": "Demo",
        "url": f"{BASE}/news/",
        "listing": {"item": "ul.news li", "link": "a", "date": ".date"},
        "detail": {"content": "article .body", "title": "h1"},
    }
)

LIST = """<html><body><nav><a href="/about">About</a></nav><ul class="news">
<li><a href="/p/1">ทุน A</a><span class="date">1 ต.ค. 2569</span></li>
<li><a href="/p/2#top">สหกิจ B</a><span class="date">30 ก.ย. 2569</span></li>
</ul></body></html>"""


def detail(title: str, body: str) -> str:
    return f"<html><body><article><h1>{title}</h1><div class='body'><p>{body}</p><script>x()</script></div></article></body></html>"


def mock_site(
    router: respx.MockRouter, list_html: str = LIST, p2_body: str = "รับสมัครสหกิจ ปิดรับ 20 ต.ค. 2569"
) -> None:
    router.get(f"{BASE}/robots.txt").respond(404)
    router.get(f"{BASE}/news/").respond(200, html=list_html)
    router.get(f"{BASE}/p/1").respond(200, html=detail("ทุน A", "ทุนการศึกษา หมดเขต 15 ต.ค. 2569"))
    router.get(f"{BASE}/p/2").respond(200, html=detail("สหกิจ B", p2_body))


def fetcher() -> PoliteFetcher:
    return PoliteFetcher("test-bot", delay_seconds=0, retries=1)


async def test_collect_stores_new_items_and_is_idempotent(session) -> None:
    await sync_sources(session, [CFG])
    with respx.mock(assert_all_called=False) as router:
        mock_site(router)
        r1 = await collect_source(session, CFG, fetcher(), NOW)
        r2 = await collect_source(session, CFG, fetcher(), NOW + timedelta(hours=2))
    assert (r1.status, r1.new, r1.seen) == ("ok", 2, 2)
    assert (r2.status, r2.new) == ("ok", 0)
    anns = (await session.scalars(select(Announcement).order_by(Announcement.url))).all()
    assert [a.url for a in anns] == [f"{BASE}/p/1", f"{BASE}/p/2"]  # fragment stripped
    assert "x()" not in anns[0].body_text
    assert anns[0].published_on.isoformat() == "2026-10-01"
    # First run of a source is a backfill: stored but never pushed as "new".
    assert all(a.matched_at is not None for a in anns)


async def test_respects_min_interval(session) -> None:
    await sync_sources(session, [CFG])
    with respx.mock(assert_all_called=False) as router:
        mock_site(router)
        await collect_source(session, CFG, fetcher(), NOW)
        r = await collect_source(session, CFG, fetcher(), NOW + timedelta(minutes=10))
    assert r.status == "skipped_interval"


async def test_changed_content_is_reextracted(session) -> None:
    await sync_sources(session, [CFG])
    with respx.mock(assert_all_called=False) as router:
        mock_site(router)
        await collect_source(session, CFG, fetcher(), NOW)
    a = await session.scalar(select(Announcement).where(Announcement.url == f"{BASE}/p/2"))
    a.needs_extraction = False
    await session.commit()
    with respx.mock(assert_all_called=False) as router:
        mock_site(
            router,
            LIST.replace("สหกิจ B", "สหกิจ B (ขยายเวลา)"),
            p2_body="รับสมัครสหกิจ ขยายเวลาปิดรับ 31 ต.ค. 2569",
        )
        r = await collect_source(session, CFG, fetcher(), NOW + timedelta(hours=2))
    await session.refresh(a)
    assert r.changed == 1
    assert a.needs_extraction is True
    assert "ขยายเวลา" in a.list_title
    assert "31 ต.ค." in a.body_text


async def test_same_content_at_new_url_is_marked_duplicate(session) -> None:
    await sync_sources(session, [CFG])
    with respx.mock(assert_all_called=False) as router:
        mock_site(router)
        await collect_source(session, CFG, fetcher(), NOW)
    extra = LIST.replace("</ul>", '<li><a href="/mirror/1">ทุน A</a></li></ul>')
    with respx.mock(assert_all_called=False) as router:
        mock_site(router, extra)
        router.get(f"{BASE}/mirror/1").respond(
            200, html=detail("ทุน A", "ทุนการศึกษา หมดเขต 15 ต.ค. 2569")
        )
        r = await collect_source(session, CFG, fetcher(), NOW + timedelta(hours=2))
    mirror = await session.scalar(
        select(Announcement).where(Announcement.url == f"{BASE}/mirror/1")
    )
    assert r.new == 1
    assert mirror.duplicate_of_id is not None
    assert mirror.needs_extraction is False


async def test_layout_change_is_reported(session) -> None:
    await sync_sources(session, [CFG])
    with respx.mock(assert_all_called=False) as router:
        mock_site(router, "<html><body><div class='redesigned'>...</div></body></html>")
        r = await collect_source(session, CFG, fetcher(), NOW, force=True)
    src = await session.get(Source, "demo")
    run = await session.scalar(select(FetchRun))
    assert r.status == "parse_empty"
    assert src.consecutive_failures == 1
    assert run.status == "parse_empty"


async def test_robots_disallow_is_obeyed(session) -> None:
    await sync_sources(session, [CFG])
    with respx.mock(assert_all_called=False) as router:
        router.get(f"{BASE}/robots.txt").respond(200, text="User-agent: *\nDisallow: /news/\n")
        news = router.get(f"{BASE}/news/").respond(200, html=LIST)
        r = await collect_source(session, CFG, fetcher(), NOW)
    assert r.status == "skipped_robots"
    assert not news.called
    assert await session.scalar(select(func.count()).select_from(Announcement)) == 0


async def test_server_errors_are_retried(session) -> None:
    await sync_sources(session, [CFG])
    with respx.mock(assert_all_called=False) as router:
        mock_site(router)
        router.get(f"{BASE}/news/").mock(
            side_effect=[httpx.Response(503), httpx.Response(200, html=LIST)]
        )
        f = fetcher()
        f.retries = 1
        import app.collector.fetcher as fmod

        orig = fmod.asyncio.sleep

        async def no_sleep(_s: float) -> None:
            return None

        fmod.asyncio.sleep = no_sleep
        try:
            r = await collect_source(session, CFG, f, NOW)
        finally:
            fmod.asyncio.sleep = orig
    assert r.status == "ok" and r.new == 2


async def test_name_lists_keep_no_body_text(session) -> None:
    await sync_sources(session, [CFG])
    names = LIST.replace("ทุน A", "ประกาศรายชื่อผู้ได้รับทุน A")
    with respx.mock(assert_all_called=False) as router:
        mock_site(router, names)
        router.get(f"{BASE}/p/1").respond(
            200, html=detail("ประกาศรายชื่อผู้ได้รับทุน A", "1. นายสมมติ ใจดี 650510000")
        )
        await collect_source(session, CFG, fetcher(), NOW)
    a = await session.scalar(select(Announcement).where(Announcement.url == f"{BASE}/p/1"))
    assert a.body_text == ""
