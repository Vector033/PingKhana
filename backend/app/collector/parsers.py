import hashlib
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import date
from email.utils import parsedate_to_datetime
from urllib.parse import urldefrag, urljoin

from selectolax.lexbor import LexborHTMLParser as HTMLParser
from selectolax.lexbor import LexborNode as Node

from app.collector.sources import SourceConfig
from app.extract.thaidate import find_dates


class ParseError(Exception):
    """The page no longer matches the configured selectors (site redesign?)."""


@dataclass
class ListItem:
    url: str
    title: str
    published_on: date | None = None
    # Thumbnail shown next to the item on the source's list page (absolute https URL).
    image: str | None = None
    # RSS only: the item's <category> labels and its text, when the feed carries it.
    categories: list[str] = field(default_factory=list)
    body: str = ""
    attachment: str | None = None  # first PDF linked from the item's text


@dataclass
class Detail:
    title: str
    text: str
    published_on: date | None = None
    image: str | None = None  # og:image of the page
    attachment: str | None = None  # first PDF linked inside the post


def clean_text(s: str) -> str:
    s = s.replace("\xa0", " ").replace("​", "")
    s = re.sub(r"[ \t\r\f\v]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s.strip()


def content_hash(title: str, text: str) -> str:
    norm = re.sub(r"\s+", " ", f"{title}\n{text}").strip().lower()
    return hashlib.sha256(norm.encode()).hexdigest()


def _first_date(text: str, ref: date) -> date | None:
    found = find_dates(text, ref)
    return found[0].value if found else None


def date_from_url(url: str, pattern: str) -> date | None:
    m = re.search(pattern, url)
    if not m:
        return None
    try:
        return date(int(m.group("y")), int(m.group("m")), int(m.group("d")))
    except ValueError:
        return None


def canonical_url(href: str, base: str) -> str:
    url, _ = urldefrag(urljoin(base, href.strip()))
    return url


_NOT_A_PHOTO = re.compile(r"emoji|logo|icon|avatar|spacer|blank|\.svg(\?|$)|^data:", re.I)


def list_image(node: Node, base_url: str) -> str | None:
    """The item's thumbnail on the list page, or None. Lazy-loaded images keep it in data-src."""
    for img in node.css("img"):
        a = img.attributes
        src = (a.get("data-src") or a.get("data-lazy-src") or a.get("src") or "").strip()
        if not src or _NOT_A_PHOTO.search(src):
            continue
        url = canonical_url(src, base_url)
        # The site is served over https; an http image would be blocked as mixed content.
        return "https://" + url.removeprefix("http://") if url.startswith("http://") else url
    return None


def parse_list(html: str, cfg: SourceConfig, base_url: str, today: date) -> list[ListItem]:
    if cfg.kind == "rss":
        return parse_rss(html)
    assert cfg.listing is not None
    tree = HTMLParser(html)
    items: list[ListItem] = []
    seen: set[str] = set()
    for node in tree.css(cfg.listing.item):
        link = (
            node
            if node.tag == "a" and cfg.listing.link == "a"
            else node.css_first(cfg.listing.link)
        )
        if link is None or not link.attributes.get("href"):
            continue
        url = canonical_url(link.attributes["href"] or "", base_url)
        if cfg.force_https and url.startswith("http://"):
            url = "https://" + url.removeprefix("http://")
        if cfg.link_must_contain and not any(p in url for p in cfg.link_must_contain):
            continue
        if url in seen:
            continue
        title_node: Node | None = node.css_first(cfg.listing.title) if cfg.listing.title else link
        title = clean_text((title_node or link).text(separator=" "))
        if not title:
            continue
        published = None
        if cfg.listing.date and (dn := node.css_first(cfg.listing.date)):
            published = _first_date(dn.attributes.get("datetime") or dn.text(), today)
        if published is None and cfg.date_from_url:
            published = date_from_url(url, cfg.date_from_url)
        seen.add(url)
        items.append(ListItem(url, title, published, list_image(node, base_url)))
    if not items:
        raise ParseError(f"no items matched {cfg.listing.item!r} on {base_url}")
    return items


_CONTENT = "{http://purl.org/rss/1.0/modules/content/}encoded"
_MEDIA = "{http://search.yahoo.com/mrss/}"
_IMG_SRC = re.compile(r"<img[^>]+?src=[\"']([^\"']+)[\"']", re.I)


def _feed_image(it: ET.Element, html: str) -> str | None:
    for tag in (f"{_MEDIA}content", f"{_MEDIA}thumbnail", "enclosure"):
        for el in it.iter(tag):
            url = el.get("url", "")
            if url and (tag != "enclosure" or el.get("type", "").startswith("image/")):
                return _https(url)
    for m in _IMG_SRC.finditer(html):
        if not _NOT_A_PHOTO.search(m.group(1)):
            return _https(m.group(1))
    return None


_DRIVE_FILE = re.compile(r"drive\.google\.com/(?:file/d/|open\?id=)([\w-]{20,})")


def first_pdf(html: str, base: str) -> str | None:
    """First PDF linked in a post's own HTML (announcements often put the details there).

    Thai offices often share the PDF on Google Drive; those links become direct downloads.
    """
    for a in HTMLParser(html).css("a[href]"):
        href = (a.attributes.get("href") or "").strip()
        label = f"{a.attributes.get('title') or ''} {a.text()}".lower()
        if re.search(r"\.pdf(\?|$)", href, re.I):
            return _https(urljoin(base, href))
        if (m := _DRIVE_FILE.search(href)) and ("pdf" in label or "ไฟล์" in label):
            return f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    return None


def _https(url: str) -> str:
    url = url.strip()
    return "https://" + url.removeprefix("http://") if url.startswith("http://") else url


LEADING_JUNK = "\ufeff \t\r\n"  # BOM and whitespace


def parse_rss(xml: str) -> list[ListItem]:
    # Some WordPress plugins print blank lines before <?xml ...?>, which is not well-formed.
    raw = xml.lstrip(LEADING_JUNK) if isinstance(xml, str) else xml.lstrip()
    root = ET.fromstring(raw.encode() if isinstance(raw, str) else raw)
    items: list[ListItem] = []
    for it in root.iter("item"):
        link = (it.findtext("link") or "").strip()
        title = clean_text(it.findtext("title") or "")
        pub = it.findtext("pubDate")
        published = None
        if pub:
            try:
                published = parsedate_to_datetime(pub).date()
            except (TypeError, ValueError):
                pass
        html = (it.findtext(_CONTENT) or "") + (it.findtext("description") or "")
        body = clean_text(HTMLParser(html).text(separator=" ")) if html else ""
        cats = [clean_text(c.text or "") for c in it.findall("category") if c.text]
        if link and title:
            items.append(
                ListItem(
                    link, title, published, _feed_image(it, html), cats, body, first_pdf(html, link)
                )
            )
    atom = "{http://www.w3.org/2005/Atom}"
    for entry in root.iter(f"{atom}entry"):
        link_el = entry.find(f"{atom}link")
        title = clean_text(entry.findtext(f"{atom}title") or "")
        if link_el is not None and title:
            items.append(ListItem(link_el.get("href", ""), title))
    if not items:
        raise ParseError("feed has no items")
    return items


def parse_detail(
    html: str, cfg: SourceConfig, fallback_title: str, today: date, fallback_url: str = ""
) -> Detail:
    tree = HTMLParser(html)
    sel = cfg.detail
    content = tree.css_first(sel.content) if sel else None
    if content is None:
        # Fall back to common article containers before giving up.
        for guess in ("article", "main", ".entry-content", "#content", "body"):
            content = tree.css_first(guess)
            if content is not None:
                break
    if content is None:
        raise ParseError("detail page has no content")
    attachment = first_pdf(content.html or "", fallback_url) if fallback_url else None
    for bad in ["script", "style", "noscript", "form", *(sel.drop if sel else [])]:
        for n in content.css(bad):
            n.decompose()
    # Keep paragraph breaks: they help the deadline finder stay on the right line.
    for n in content.css("br, p, li, div, h1, h2, h3, h4, tr"):
        n.insert_after("\n")
    text = clean_text(content.text(separator=" "))
    title = fallback_title
    if sel and sel.title and (tn := tree.css_first(sel.title)):
        title = clean_text(tn.text()) or fallback_title
    if cfg.title_strip_suffix and title.endswith(cfg.title_strip_suffix):
        title = title.removesuffix(cfg.title_strip_suffix).strip()
    published = None
    if sel and sel.date and (dn := tree.css_first(sel.date)):
        published = _first_date(dn.attributes.get("datetime") or dn.text(), today)
    image = None
    if og := tree.css_first('meta[property="og:image"]'):
        src = (og.attributes.get("content") or "").strip()
        if src and not _NOT_A_PHOTO.search(src):
            image = _https(src)
    return Detail(title, text, published, image, attachment)
