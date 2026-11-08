"""Turn collected announcements into structured fields.

Gemini's free tier allows only a few requests per minute and per day, and the first production
run has ~70 new announcements. So each run gets a GeminiBudget: at most N calls, spaced out, and
it stops for the rest of the run at the first quota/overload error. Announcements beyond the
budget get the rule-based result right away (so the site and reminders work), and later runs
upgrade them to Gemini while budget is left.
"""

import asyncio
import logging
import time
from datetime import date, timedelta
from decimal import Decimal

import httpx
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import BANGKOK, get_settings
from app.extract import rules
from app.extract.gemini import RETRY_STATUS, GeminiExtractor
from app.extract.schema import Extracted
from app.models import Announcement

log = logging.getLogger(__name__)

# Rule-based result that Gemini should replace when budget allows.
RULES = "rules"
# Gemini rejected this one for a non-quota reason; do not spend budget on it again.
RULES_GEMINI_FAILED = "rules:gemini-error"
CALL_TIMEOUT = 90.0
POSTER_TYPES = ("image/jpeg", "image/png", "image/webp", "image/gif")
POSTER_MAX_BYTES = 6_000_000
REQUEST_TIMEOUT = 25.0


class GeminiBudget:
    def __init__(self, calls: int, min_interval: float = 0.0, max_seconds: float | None = None):
        self.left = max(0, calls)
        self.min_interval = min_interval
        # Slow answers (the model retries 503s internally) must not push the run past the
        # scheduler's 10-minute HTTP timeout.
        self.deadline = time.monotonic() + max_seconds if max_seconds else None
        self.used = 0
        self.tripped = False
        self._last = 0.0

    @property
    def available(self) -> bool:
        if self.deadline is not None and time.monotonic() >= self.deadline:
            return False
        return self.left > 0 and not self.tripped

    async def take(self) -> bool:
        if not self.available:
            return False
        wait = self._last + self.min_interval - time.monotonic()
        if self._last and wait > 0:
            await asyncio.sleep(wait)
        self.left -= 1
        self.used += 1
        self._last = time.monotonic()
        return True

    def trip(self, reason: str) -> None:
        if not self.tripped:
            log.warning("gemini paused for this run after %d calls: %s", self.used, reason)
        self.tripped = True


def new_budget() -> GeminiBudget:
    s = get_settings()
    calls = s.gemini_max_calls_per_run if s.gemini_api_key else 0
    return GeminiBudget(calls, s.gemini_min_interval_seconds, s.gemini_max_seconds_per_run)


async def fetch_poster(url: str | None) -> tuple[bytes, str] | None:
    """Download a post's poster for Gemini; None when missing, too big or not an image."""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            async with c.stream("GET", url, headers={"User-Agent": get_settings().user_agent}) as r:
                mime = r.headers.get("content-type", "").split(";")[0].strip().lower()
                if r.status_code != 200 or mime not in POSTER_TYPES:
                    return None
                data = b""
                async for chunk in r.aiter_bytes():
                    data += chunk
                    if len(data) > POSTER_MAX_BYTES:
                        return None
                return data, mime
    except httpx.HTTPError as e:
        log.info("poster %s not fetched: %r", url, e)
        return None


async def _gemini(
    ex: GeminiExtractor | None, budget: GeminiBudget, a: Announcement, ref: date
) -> tuple[Extracted | None, bool]:
    """(result, permanently_failed). None when out of budget or Gemini could not answer."""
    if ex is None or not await budget.take():
        return None, False
    poster = await fetch_poster(a.image_url)
    try:
        # One answer may retry 503/429 across fallback models for minutes; cap it.
        return (
            await asyncio.wait_for(ex.extract(a.title, a.body_text, ref, poster), CALL_TIMEOUT),
            False,
        )
    except TimeoutError:
        budget.trip(f"no answer within {CALL_TIMEOUT:.0f}s")
        return None, False
    except (httpx.TransportError, httpx.HTTPStatusError) as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status is None or status in RETRY_STATUS:
            budget.trip(repr(e)[:120])  # quota or overload: retry in a later run
            return None, False
        log.warning("gemini rejected announcement %s: %r", a.id, e)
        return None, True
    except Exception:  # noqa: BLE001 - a bad answer (invalid JSON, schema) falls back to rules
        log.exception("gemini answer for announcement %s unusable", a.id)
        return None, True


def apply(a: Announcement, r: Extracted) -> None:
    a.category = r.category.value
    a.summary_th = r.summary_th
    a.deadline = r.deadline
    a.deadline_text = r.deadline_text
    a.eligible_years = r.eligible_years
    a.eligible_majors = r.eligible_majors
    a.min_gpax = Decimal(str(r.min_gpax)) if r.min_gpax is not None else None
    a.extraction_method = r.method
    a.needs_extraction = False


def _ref(a: Announcement) -> date:
    return a.published_on or a.first_seen_at.astimezone(BANGKOK).date()


def _extractor(client: httpx.AsyncClient) -> GeminiExtractor | None:
    s = get_settings()
    if not s.gemini_api_key:
        return None
    return GeminiExtractor(s.gemini_api_key, s.gemini_model, client, s.gemini_fallbacks)


async def extract_pending(
    session: AsyncSession, budget: GeminiBudget | None = None, limit: int = 50
) -> int:
    """Extract up to `limit` new announcements. Every one gets a result, Gemini or rules."""
    budget = budget or new_budget()
    rows = (
        await session.scalars(
            select(Announcement)
            .where(Announcement.needs_extraction, Announcement.duplicate_of_id.is_(None))
            .order_by(Announcement.id)
            .limit(limit)
        )
    ).all()
    # Short per-request timeout so a hanging model falls back instead of eating the budget.
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        ex = _extractor(client)
        for a in rows:
            ref = _ref(a)
            r, failed = await _gemini(ex, budget, a, ref)
            apply(a, r or rules.extract(a.title, a.body_text, ref))
            if failed:
                a.extraction_method = RULES_GEMINI_FAILED
            await session.commit()
    return len(rows)


async def upgrade_rule_results(session: AsyncSession, budget: GeminiBudget, today: date) -> int:
    """Spend what is left of the budget re-reading rule-based results with Gemini.

    Still-open announcements first, then the newest.
    """
    if not budget.available:
        return 0
    rows = (
        await session.scalars(
            select(Announcement)
            .where(
                Announcement.extraction_method == RULES,
                Announcement.needs_extraction.is_(False),
                Announcement.duplicate_of_id.is_(None),
            )
            .order_by(
                case((Announcement.deadline >= today, 0), else_=1),
                Announcement.id.desc(),
            )
            .limit(budget.left)
        )
    ).all()
    upgraded = 0
    # Short per-request timeout so a hanging model falls back instead of eating the budget.
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        ex = _extractor(client)
        for a in rows:
            r, failed = await _gemini(ex, budget, a, _ref(a))
            if r:
                apply(a, r)
                upgraded += 1
            elif failed:
                a.extraction_method = RULES_GEMINI_FAILED
            elif not budget.available:
                break
            await session.commit()
        await session.commit()
    return upgraded


async def read_posters(session: AsyncSession, budget: GeminiBudget, today: date) -> int:
    """Re-read recent Gemini results that found no deadline, this time with the poster.

    Runs after new posts and rule upgrades, so it only spends budget that is left over. Each post
    is tried once (its method then ends in "+poster"), whether or not a deadline turns up.
    """
    if not budget.available:
        return 0
    rows = (
        await session.scalars(
            select(Announcement)
            .where(
                Announcement.extraction_method.like("gemini:%"),
                Announcement.extraction_method.not_like("%+poster"),
                Announcement.deadline.is_(None),
                Announcement.image_url.is_not(None),
                Announcement.category != "general",
                Announcement.duplicate_of_id.is_(None),
                Announcement.first_seen_at >= today - timedelta(days=60),
            )
            .order_by(Announcement.id.desc())
            .limit(budget.left)
        )
    ).all()
    found = 0
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        ex = _extractor(client)
        for a in rows:
            r, failed = await _gemini(ex, budget, a, _ref(a))
            if r:
                apply(a, r)
                found += r.deadline is not None
            elif failed:
                a.extraction_method = (a.extraction_method or "") + "+poster"
            elif not budget.available:
                break
            await session.commit()
    return found
