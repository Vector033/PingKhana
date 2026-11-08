from pathlib import Path

import httpx
import pytest
import respx

from app.collector import discover as d
from app.collector.fetcher import PoliteFetcher

FIX = Path(__file__).parent / "fixtures" / "html"


@pytest.fixture(autouse=True)
def public_dns(monkeypatch):
    async def ok(url: str) -> None:
        d._public_host(url)

    monkeypatch.setattr(d, "ensure_public", ok)


def fetcher() -> PoliteFetcher:
    return PoliteFetcher("test-bot", delay_seconds=0, retries=0)


@respx.mock
async def test_a_feed_link_is_used_directly() -> None:
    respx.get("https://news.example.org/robots.txt").mock(return_value=httpx.Response(404))
    xml = (FIX / "ksp_feed.xml").read_text(encoding="utf-8")
    respx.get("https://news.example.org/feed/").mock(
        return_value=httpx.Response(200, text=xml, headers={"content-type": "application/rss+xml"})
    )
    got = await d.discover("news.example.org/feed/", fetcher())
    assert got.kind == "rss" and got.method == "feed"
    assert len(got.preview) == 5 and got.pack == "teacher"


@respx.mock
async def test_page_that_advertises_a_feed() -> None:
    respx.get("https://school.example.org/robots.txt").mock(return_value=httpx.Response(404))
    page = (
        "<html><head><title>โรงเรียนตัวอย่าง | หน้าแรก</title>"
        '<link rel="alternate" type="application/rss+xml" href="/news/feed/"></head><body></body></html>'
    )
    respx.get("https://school.example.org/").mock(return_value=httpx.Response(200, text=page))
    xml = (FIX / "kruachieve_feed.xml").read_text(encoding="utf-8")
    respx.get("https://school.example.org/news/feed/").mock(
        return_value=httpx.Response(200, text=xml)
    )
    got = await d.discover("https://school.example.org/", fetcher())
    assert got.method == "feed-autodiscovery"
    assert got.url == "https://school.example.org/news/feed/"
    assert got.name == "โรงเรียนตัวอย่าง" and got.pack == "teacher"


@respx.mock
async def test_no_feed_asks_gemini_for_selectors_and_checks_them(monkeypatch) -> None:
    respx.get("https://www.cs.science.cmu.ac.th/robots.txt").mock(return_value=httpx.Response(404))
    html = (FIX / "cs_cmu_list.html").read_text(encoding="utf-8")
    respx.get("https://www.cs.science.cmu.ac.th/").mock(return_value=httpx.Response(200, text=html))
    respx.get(
        url__regex=r"https://www\.cs\.science\.cmu\.ac\.th/(feed/|rss.*|feed\.xml|atom\.xml|index\.xml)"
    ).mock(return_value=httpx.Response(404))

    async def fake_gemini(url, page):
        return {
            "item": "article.eael-grid-post",
            "link": "h2.eael-entry-title a",
            "title": None,
            "date": None,
            "name": "ภาควิชาวิทยาการคอมพิวเตอร์",
            "audience": "student",
        }

    monkeypatch.setattr(d, "_ask_gemini_for_selectors", fake_gemini)
    got = await d.discover("https://www.cs.science.cmu.ac.th/", fetcher())
    assert got.kind == "html" and got.method == "gemini-selectors"
    assert got.listing == {"item": "article.eael-grid-post", "link": "h2.eael-entry-title a"}
    assert len(got.preview) == 5


@respx.mock
async def test_robots_disallow_is_refused() -> None:
    respx.get("https://closed.example.org/robots.txt").mock(
        return_value=httpx.Response(200, text="User-agent: *\nDisallow: /")
    )
    with pytest.raises(d.DiscoveryError, match="robots"):
        await d.discover("https://closed.example.org/", fetcher())


async def test_internal_addresses_are_refused(monkeypatch) -> None:
    monkeypatch.undo()  # real ensure_public
    for url in ("http://127.0.0.1/", "http://10.0.0.5/feed", "http://[::1]/", "ftp://example.org/"):
        with pytest.raises(d.DiscoveryError):
            await d.ensure_public(url)
    with pytest.raises(d.DiscoveryError):
        await d.ensure_public("https://example.org:8443/")
