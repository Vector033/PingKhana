"""Turn a link someone pastes into a source config, so people never need to know what RSS is.

1. Safety: only public http(s) hosts on ports 80/443 (no internal addresses), and robots.txt.
2. A feed is used when the link is one, when the page advertises one (<link rel="alternate">),
   or at a usual path (/feed/, /rss, ...).
3. Otherwise Gemini reads the page and names CSS selectors for the list of posts; they are
   checked by parsing the page with them before anything is shown.

The result has a preview of the posts, so the person can confirm it is the right page, and then
waits for an admin to approve it.
"""

import asyncio
import ipaddress
import json
import logging
import re
import socket
from dataclasses import dataclass, field
from datetime import date
from urllib.parse import urljoin, urlsplit

import httpx
from selectolax.lexbor import LexborHTMLParser as HTMLParser

from app.collector.fetcher import PoliteFetcher, RobotsDisallowed
from app.collector.parsers import ListItem, ParseError, parse_list, parse_rss
from app.collector.sources import ListSelectors, SourceConfig
from app.config import get_settings

log = logging.getLogger(__name__)

FEED_PATHS = ("feed/", "rss", "rss.xml", "feed.xml", "atom.xml", "index.xml")
TEACHER_WORDS = ("ครู", "ศึกษาธิการ", "สพฐ", "สพป", "สพม", "คุรุสภา", "โรงเรียน", "ก.ค.ศ")
STUDENT_WORDS = ("มหาวิทยาลัย", "คณะ", "นักศึกษา", "ภาควิชา", "university", "faculty")


class DiscoveryError(Exception):
    """Shown to the person as-is (Thai)."""


@dataclass
class Discovery:
    kind: str  # "rss" | "html"
    url: str  # what the collector fetches: the feed, or the list page
    homepage: str
    name: str
    pack: str
    method: str  # "feed" | "feed-autodiscovery" | "gemini-selectors"
    listing: dict | None = None
    preview: list[dict] = field(default_factory=list)


def _public_host(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise DiscoveryError("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://")
    if parts.port not in (None, 80, 443):
        raise DiscoveryError("รองรับเฉพาะเว็บที่ใช้พอร์ตปกติ (80/443)")
    return parts.hostname


async def ensure_public(url: str) -> None:
    """Refuse hosts that resolve to private, loopback or link-local addresses (SSRF)."""
    host = _public_host(url)
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise DiscoveryError("หาเว็บนี้ไม่เจอ ตรวจชื่อเว็บอีกครั้ง") from e
    for info in infos:
        if not ipaddress.ip_address(info[4][0]).is_global:
            raise DiscoveryError("ลิงก์นี้ชี้ไปที่เครือข่ายภายใน ใช้ไม่ได้")


def _items_preview(items: list[ListItem]) -> list[dict]:
    return [
        {
            "title": i.title,
            "url": i.url,
            "published_on": i.published_on.isoformat() if i.published_on else None,
            "image": i.image,
        }
        for i in items[:5]
    ]


def guess_pack(text: str) -> str:
    t = text.lower()
    if any(w in t for w in TEACHER_WORDS):
        return "teacher"
    if any(w in t for w in STUDENT_WORDS):
        return "student"
    return "general"


def _site_name(html: str, fallback: str) -> str:
    tree = HTMLParser(html)
    for sel, attr in (('meta[property="og:site_name"]', "content"), ("title", None)):
        n = tree.css_first(sel)
        if n is not None:
            v = (n.attributes.get(attr) if attr else n.text()) or ""
            v = re.split(r"\s+[|–—-]\s+", v.strip())[0].strip()
            if v:
                return v[:120]
    return fallback


def _looks_like_feed(text: str) -> bool:
    head = text.lstrip()[:500].lower()
    return head.startswith("<?xml") or "<rss" in head or "<feed" in head


def _feed_links(html: str, base: str) -> list[str]:
    tree = HTMLParser(html)
    out = []
    for n in tree.css('link[rel="alternate"]'):
        t = (n.attributes.get("type") or "").lower()
        href = n.attributes.get("href")
        if href and ("rss" in t or "atom" in t) and "comments" not in href:
            out.append(urljoin(base, href))
    return out


def _condense(html: str, limit: int = 40_000) -> str:
    """Page HTML without scripts/styles/svg, for Gemini to read the structure."""
    tree = HTMLParser(html)
    for bad in ("script", "style", "svg", "noscript", "iframe", "link", "meta"):
        for n in tree.css(bad):
            n.decompose()
    body = tree.body.html if tree.body else tree.html
    return re.sub(r"\s+", " ", body or "")[:limit]


SELECTOR_PROMPT = """หน้าเว็บนี้มีรายการข่าวหรือประกาศหลายรายการ ช่วยหา CSS selector สำหรับอ่านรายการนั้น
ตอบ JSON:
- item: selector ของแต่ละรายการ (ต้องเลือกได้อย่างน้อย 3 รายการ และไม่รวมเมนู)
- link: selector ของลิงก์ไปหน้าข่าว ภายใน item (ใช้ "a" ถ้า item เป็นลิงก์เอง)
- title: selector ของหัวข้อภายใน item หรือ null ถ้าใช้ข้อความของลิงก์
- date: selector ของวันที่ภายใน item หรือ null
- name: ชื่อหน่วยงานหรือเว็บ (ภาษาไทยถ้ามี)
- audience: student (นักศึกษา/มหาวิทยาลัย), teacher (ครู/การศึกษาขั้นพื้นฐาน) หรือ general

URL: {url}
HTML:
{html}
"""

SELECTOR_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "item": {"type": "STRING"},
        "link": {"type": "STRING"},
        "title": {"type": "STRING", "nullable": True},
        "date": {"type": "STRING", "nullable": True},
        "name": {"type": "STRING"},
        "audience": {"type": "STRING", "enum": ["student", "teacher", "general"]},
    },
    "required": ["item", "link", "name", "audience"],
}


async def _ask_gemini_for_selectors(url: str, html: str) -> dict:
    from app.extract.gemini import GeminiExtractor

    s = get_settings()
    if not s.gemini_api_key:
        raise DiscoveryError("เว็บนี้ไม่มี RSS และตอนนี้ยังใช้ AI ช่วยอ่านหน้าเว็บไม่ได้")
    async with httpx.AsyncClient(timeout=40) as client:
        ex = GeminiExtractor(s.gemini_api_key, s.gemini_model, client, s.gemini_fallbacks)
        return await ex.ask_json(
            SELECTOR_PROMPT.format(url=url, html=_condense(html)), SELECTOR_SCHEMA
        )


async def discover(url: str, fetcher: PoliteFetcher | None = None) -> Discovery:
    url = url.strip()
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    try:
        await ensure_public(url)
    except DiscoveryError as e:
        # People type "econ.cmu.ac.th" when only www.econ.cmu.ac.th has a DNS record.
        host = urlsplit(url).hostname or ""
        if not isinstance(e.__cause__, socket.gaierror) or host.startswith("www."):
            raise
        url = url.replace(f"//{host}", f"//www.{host}", 1)
        await ensure_public(url)
    own = fetcher is None
    fetcher = fetcher or PoliteFetcher(get_settings().user_agent, delay_seconds=1.0, retries=1)
    try:
        try:
            try:
                page = await fetcher.get(url)
            except httpx.HTTPError:
                # People type "obec.go.th"; some sites only answer on www.
                host = urlsplit(url).hostname or ""
                if host.startswith("www."):
                    raise
                url = url.replace(f"//{host}", f"//www.{host}", 1)
                await ensure_public(url)
                page = await fetcher.get(url)
        except RobotsDisallowed as e:
            raise DiscoveryError("เว็บนี้ไม่อนุญาตให้บอทอ่าน (robots.txt) จึงติดตามไม่ได้") from e
        except httpx.HTTPError as e:
            raise DiscoveryError("เปิดเว็บนี้ไม่ได้ ลองตรวจลิงก์ หรือเว็บอาจปิดกั้นการเข้าจากต่างประเทศ") from e
        await ensure_public(page.url)  # after redirects
        parts = urlsplit(page.url)
        homepage = f"{parts.scheme}://{parts.netloc}/"

        if _looks_like_feed(page.text):
            items = parse_rss(page.text, page.url)
            name = _feed_title(page.text) or parts.netloc
            return Discovery(
                "rss",
                page.url,
                homepage,
                name,
                guess_pack(name + page.text[:3000]),
                "feed",
                None,
                _items_preview(items),
            )

        name = _site_name(page.text, parts.netloc)
        candidates = _feed_links(page.text, page.url) + [urljoin(homepage, p) for p in FEED_PATHS]
        for feed_url in dict.fromkeys(candidates):
            try:
                await ensure_public(feed_url)
                feed = await fetcher.get(feed_url)
                if not _looks_like_feed(feed.text):
                    continue
                items = parse_rss(feed.text, feed.url)
            except (httpx.HTTPError, RobotsDisallowed, ParseError, DiscoveryError, ValueError):
                continue
            if len(items) >= 3:
                return Discovery(
                    "rss",
                    feed.url,
                    homepage,
                    name,
                    guess_pack(name + page.text[:5000]),
                    "feed-autodiscovery",
                    None,
                    _items_preview(items),
                )

        ans = await _ask_gemini_for_selectors(page.url, page.text)
        listing = {k: ans.get(k) for k in ("item", "link", "title", "date") if ans.get(k)}
        cfg = SourceConfig(
            id="probe", name=name, url=page.url, listing=ListSelectors.model_validate(listing)
        )
        try:
            items = parse_list(page.text, cfg, page.url, date.today())
        except ParseError as e:
            raise DiscoveryError("อ่านรายการข่าวจากหน้านี้ไม่ได้ ลองใส่ลิงก์หน้ารวมข่าวโดยตรง") from e
        if len(items) < 3:
            raise DiscoveryError("หน้านี้มีรายการข่าวน้อยเกินไป ลองใส่ลิงก์หน้ารวมข่าวโดยตรง")
        return Discovery(
            "html",
            page.url,
            homepage,
            ans.get("name") or name,
            ans.get("audience") or guess_pack(name),
            "gemini-selectors",
            listing,
            _items_preview(items),
        )
    finally:
        if own:
            await fetcher.aclose()


def _feed_title(xml: str) -> str | None:
    m = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", xml, re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip()[:120] if m else None


def to_config(d: dict, source_id: str) -> dict:
    """What gets stored on the Source row for a user-added source."""
    cfg = {"kind": d["kind"], "url": d["url"], "homepage": d.get("homepage")}
    if d.get("listing"):
        cfg["listing"] = d["listing"]
    cfg["preview"] = d.get("preview", [])[:5]
    return json.loads(json.dumps(cfg))
