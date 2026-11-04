import logging
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import BANGKOK, get_settings
from app.extract import rules
from app.extract.gemini import GeminiExtractor
from app.extract.schema import Extracted
from app.models import Announcement

log = logging.getLogger(__name__)


async def extract_one(title: str, body: str, ref: date) -> Extracted:
    s = get_settings()
    if s.gemini_api_key:
        try:
            return await GeminiExtractor(s.gemini_api_key, s.gemini_model).extract(title, body, ref)
        except Exception:  # noqa: BLE001 - any LLM failure falls back to rules
            log.exception("gemini extraction failed, falling back to rules")
    return rules.extract(title, body, ref)


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


async def extract_pending(session: AsyncSession, limit: int = 50) -> int:
    rows = (
        await session.scalars(
            select(Announcement)
            .where(Announcement.needs_extraction, Announcement.duplicate_of_id.is_(None))
            .order_by(Announcement.id)
            .limit(limit)
        )
    ).all()
    for a in rows:
        ref = a.published_on or a.first_seen_at.astimezone(BANGKOK).date()
        apply(a, await extract_one(a.title, a.body_text, ref))
        await session.commit()
    return len(rows)
