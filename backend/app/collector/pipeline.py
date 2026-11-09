"""Collect announcements: list page -> new detail pages -> dedupe -> store.

Idempotent: running it twice in a row stores nothing new and, because of the per-source
interval, does not even hit the site the second time.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.collector.fetcher import PoliteFetcher, RobotsDisallowed
from app.collector.parsers import ParseError, content_hash, parse_detail, parse_list
from app.collector.sources import SourceConfig, load_sources
from app.config import BANGKOK, get_settings
from app.models import Announcement, FetchRun, Source

log = logging.getLogger(__name__)

# Result lists ("ประกาศรายชื่อผู้ได้รับทุน") carry students' names and IDs. We keep only the
# title and the link for those, never their text.
NAME_LIST = re.compile(
    r"ประกาศรายชื่อ|รายชื่อผู้(?:ได้รับ|มีสิทธิ|ผ่าน|สอบ)|ผลการคัดเลือก|list of (?:winners|candidates)", re.I
)

# After this many failures in a row a source is reported as broken on /api/health.
BROKEN_AFTER = 3


@dataclass
class RunResult:
    source_id: str
    status: str
    new: int = 0
    changed: int = 0
    seen: int = 0
    errors: list[str] = field(default_factory=list)


async def user_source_configs(session: AsyncSession) -> list[SourceConfig]:
    """Approved sources that people added on the website (config stored on the row)."""
    rows = (
        await session.scalars(
            select(Source).where(
                Source.config.is_not(None), Source.status == "approved", Source.enabled
            )
        )
    ).all()
    out = []
    for s in rows:
        cfg = {k: v for k, v in (s.config or {}).items() if k != "preview"}
        try:
            out.append(
                SourceConfig.model_validate({**cfg, "id": s.id, "name": s.name, "pack": s.pack})
            )
        except ValueError:
            log.warning("user source %s has an invalid config", s.id)
    return out


async def sync_sources(session: AsyncSession, configs: list[SourceConfig]) -> None:
    for cfg in configs:
        src = await session.get(Source, cfg.id)
        if src is None:
            src = Source(id=cfg.id)
            session.add(src)
        # The stored URL is what people see; feeds point them at the site, not the XML.
        src.name, src.url, src.enabled = cfg.name, cfg.homepage or cfg.url, cfg.enabled
        src.pack = cfg.pack
        src.note = cfg.note
    await session.commit()


async def collect_source(
    session: AsyncSession,
    cfg: SourceConfig,
    fetcher: PoliteFetcher,
    now: datetime,
    force: bool = False,
) -> RunResult:
    src = await session.get(Source, cfg.id)
    assert src is not None, "call sync_sources first"
    interval = timedelta(minutes=get_settings().min_fetch_interval_minutes)
    if not force and src.last_fetched_at and now - src.last_fetched_at < interval:
        return RunResult(cfg.id, "skipped_interval")

    run = FetchRun(source_id=cfg.id, status="running", started_at=now)
    session.add(run)
    src.last_fetched_at = now
    first_run = src.last_success_at is None
    today = now.astimezone(BANGKOK).date()
    result = RunResult(cfg.id, "ok")

    try:
        page = await fetcher.get(cfg.url)
        run.http_status = page.status
        items = parse_list(page.text, cfg, page.url, today)
        if cfg.skip_categories:
            items = [
                i
                for i in items
                if not any(s in c for c in i.categories for s in cfg.skip_categories)
            ]
        result.seen = len(items)

        known = {
            a.url: a
            for a in (
                await session.scalars(
                    select(Announcement).where(Announcement.url.in_([i.url for i in items]))
                )
            ).all()
        }
        fetched_details = 0
        for item in items:
            existing = known.get(item.url)
            if existing is not None:
                existing.last_seen_at = now
                if item.image and existing.image_url != item.image:
                    existing.image_url = item.image
                if existing.list_title == item.title:
                    continue
                # Title changed on the list (e.g. "ขยายเวลา"): re-read the page.
            if fetched_details >= cfg.max_new_per_run:
                break
            try:
                dpage = await fetcher.get(item.url)
                detail = parse_detail(dpage.text, cfg, item.title, today, dpage.url)
            except (httpx.HTTPError, ParseError, RobotsDisallowed) as e:
                result.errors.append(f"{item.url}: {e}")
                continue
            fetched_details += 1
            # Feeds sometimes carry the full post; keep whichever text is longer.
            if len(item.body) > len(detail.text):
                detail.text = item.body
            if NAME_LIST.search(detail.title) or NAME_LIST.search(item.title):
                detail.text = ""
            h = content_hash(detail.title, detail.text)

            if existing is not None:
                existing.title = detail.title
                existing.list_title = item.title
                if existing.content_hash != h:
                    existing.content_hash = h
                    existing.body_text = detail.text
                    existing.needs_extraction = True
                    result.changed += 1
                continue

            dup = await session.scalar(
                select(Announcement.id).where(Announcement.content_hash == h).limit(1)
            )
            ann = Announcement(
                source_id=cfg.id,
                url=item.url,
                title=detail.title,
                list_title=item.title,
                image_url=item.image or detail.image,
                attachment_url=detail.attachment or item.attachment,
                body_text=detail.text,
                content_hash=h,
                duplicate_of_id=dup,
                published_on=item.published_on or detail.published_on,
                first_seen_at=now,
                last_seen_at=now,
                needs_extraction=dup is None,
                # On a source's first run everything is old news: store it, don't push it.
                matched_at=now if first_run or dup is not None else None,
            )
            session.add(ann)
            result.new += 1

        src.consecutive_failures = 0
        src.last_error = None
        src.last_success_at = now
    except RobotsDisallowed:
        result.status = "skipped_robots"
    except ParseError as e:
        # The list selector found nothing: most likely the site changed its layout.
        result.status = "parse_empty"
        result.errors.append(str(e))
    except httpx.HTTPStatusError as e:
        result.status = "http_error"
        run.http_status = e.response.status_code
        result.errors.append(str(e))
    except httpx.HTTPError as e:
        result.status = "error"
        result.errors.append(repr(e))

    if result.status != "ok":
        src.consecutive_failures += 1
        src.last_error = "; ".join(result.errors)[:2000] or result.status
        log.warning("source %s failed (%s): %s", cfg.id, result.status, src.last_error)
    run.status = result.status
    run.items_seen, run.items_new, run.items_changed = result.seen, result.new, result.changed
    run.error = "; ".join(result.errors)[:4000] or None
    run.finished_at = datetime.now(tz=BANGKOK)
    await session.commit()
    return result


async def collect_all(
    session: AsyncSession, fetcher: PoliteFetcher | None = None, force: bool = False
) -> list[RunResult]:
    yaml_configs = load_sources()
    # Sync every yaml source, so turning one off there also hides it on the site.
    await sync_sources(session, yaml_configs)
    configs = [c for c in yaml_configs if c.enabled] + await user_source_configs(session)
    own = fetcher is None
    fetcher = fetcher or PoliteFetcher(get_settings().user_agent)
    try:
        now = datetime.now(tz=BANGKOK)
        return [await collect_source(session, c, fetcher, now, force) for c in configs]
    finally:
        if own:
            await fetcher.aclose()
