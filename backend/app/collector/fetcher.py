"""Polite HTTP fetching: identifies itself, obeys robots.txt, spaces out requests, retries."""

import asyncio
import logging
import re
import time
from dataclasses import dataclass
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import httpx

log = logging.getLogger(__name__)


class RobotsDisallowed(Exception):
    pass


@dataclass
class Page:
    url: str
    status: int
    text: str


def decode(content: bytes, header_charset: str | None) -> str:
    """Use the charset from the header, then from <meta>, then UTF-8 (Thai sites vary)."""
    charset = header_charset
    if not charset:
        m = re.search(rb'<meta[^>]+charset=["\']?([\w-]+)', content[:4096], re.I)
        charset = m.group(1).decode() if m else "utf-8"
    if charset.lower() in ("tis-620", "tis620", "iso-8859-11", "windows-874"):
        charset = "cp874"
    try:
        return content.decode(charset)
    except (LookupError, UnicodeDecodeError):
        return content.decode("utf-8", errors="replace")


class PoliteFetcher:
    def __init__(
        self,
        user_agent: str,
        delay_seconds: float = 3.0,
        retries: int = 3,
        client: httpx.AsyncClient | None = None,
    ):
        self.user_agent = user_agent
        self.delay = delay_seconds
        self.retries = retries
        self.client = client or httpx.AsyncClient(
            timeout=30, follow_redirects=True, headers={"User-Agent": user_agent}
        )
        self._robots: dict[str, RobotFileParser] = {}
        self._last_hit: dict[str, float] = {}

    async def aclose(self) -> None:
        await self.client.aclose()

    async def _wait_turn(self, host: str) -> None:
        last = self._last_hit.get(host)
        if last is not None:
            wait = self.delay - (time.monotonic() - last)
            if wait > 0:
                await asyncio.sleep(wait)
        self._last_hit[host] = time.monotonic()

    async def allowed(self, url: str) -> bool:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        rp = self._robots.get(origin)
        if rp is None:
            rp = RobotFileParser()
            try:
                await self._wait_turn(parts.netloc)
                resp = await self.client.get(f"{origin}/robots.txt")
                if resp.status_code == 200 and "text/html" not in resp.headers.get(
                    "content-type", ""
                ):
                    rp.parse(resp.text.splitlines())
                elif resp.status_code in (401, 403):
                    rp.parse(["User-agent: *", "Disallow: /"])
                else:  # 404 or an HTML error page: no rules
                    rp.parse([])
            except httpx.HTTPError:
                log.warning("robots.txt unreachable for %s; treating as allowed", origin)
                rp.parse([])
            self._robots[origin] = rp
        return rp.can_fetch(self.user_agent, url)

    async def get(self, url: str) -> Page:
        if not await self.allowed(url):
            raise RobotsDisallowed(url)
        host = urlsplit(url).netloc
        backoff = 2.0
        for attempt in range(self.retries + 1):
            await self._wait_turn(host)
            try:
                resp = await self.client.get(url)
            except (httpx.TimeoutException, httpx.TransportError):
                if attempt == self.retries:
                    raise
            else:
                if resp.status_code < 500 and resp.status_code != 429:
                    resp.raise_for_status()
                    ctype = resp.headers.get("content-type", "")
                    m = re.search(r"charset=([\w-]+)", ctype)
                    return Page(
                        str(resp.url), resp.status_code, decode(resp.content, m and m.group(1))
                    )
                if attempt == self.retries:
                    resp.raise_for_status()
            log.info("retrying %s in %.0fs", url, backoff)
            await asyncio.sleep(backoff)
            backoff *= 2
        raise RuntimeError("unreachable")
