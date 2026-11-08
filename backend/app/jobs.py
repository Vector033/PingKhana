"""Scheduled work. Run `python -m app.jobs [collect|extract|notify|all] [--force]` from cron,
or call POST /jobs/run. Each step is idempotent, so overlapping or repeated runs are safe."""

import argparse
import asyncio
import json
import logging
from dataclasses import asdict
from datetime import datetime

from app import notify
from app.collector.pipeline import collect_all
from app.config import BANGKOK
from app.db import SessionLocal
from app.extract.service import (
    extract_pending,
    new_budget,
    popular_tags,
    read_posters,
    tag_recent,
    upgrade_rule_results,
)
from app.line.client import get_line_client

log = logging.getLogger(__name__)


async def collect(force: bool = False) -> list[dict]:
    async with SessionLocal() as s:
        return [asdict(r) for r in await collect_all(s, force=force)]


async def extract() -> dict:
    """New announcements first; leftover Gemini budget then upgrades older rule-based results."""
    budget = new_budget()
    total = 0
    async with SessionLocal() as s:
        budget.known_tags = await popular_tags(s)
        while n := await extract_pending(s, budget):
            total += n
        today = datetime.now(tz=BANGKOK).date()
        upgraded = await upgrade_rule_results(s, budget, today)
        posters = await read_posters(s, budget, today)
        tagged = await tag_recent(s, budget, today)
    return {
        "new": total,
        "upgraded": upgraded,
        "deadlines_from_posters": posters,
        "tagged": tagged,
        "gemini_calls": budget.used,
        "gemini_paused": budget.tripped,
    }


async def send() -> dict:
    now = datetime.now(tz=BANGKOK)
    async with SessionLocal() as s:
        reminders = await notify.plan_reminders(s, now.date())
        digests = await notify.plan_digests(s, now)
        stats = await notify.dispatch(s, get_line_client(), now)
    return {"reminders_planned": reminders, "digests_planned": digests, **stats}


async def run_all(force: bool = False) -> dict:
    return {"collect": await collect(force), "extracted": await extract(), "notify": await send()}


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    p = argparse.ArgumentParser()
    p.add_argument(
        "step", choices=["collect", "extract", "notify", "all"], default="all", nargs="?"
    )
    p.add_argument("--force", action="store_true", help="ignore the per-source fetch interval")
    a = p.parse_args()
    step = {
        "collect": lambda: collect(a.force),
        "extract": extract,
        "notify": send,
        "all": lambda: run_all(a.force),
    }[a.step]
    print(json.dumps(asyncio.run(step()), ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
