"""The same announcement posted on several sites becomes one card.

Exact copies are caught at collection time by content hash. This catches reposts whose text
differs (a faculty page and the university job board word things differently): recent posts
from different sources whose titles are close, carry the same numbers, and agree on the
deadline. The earliest copy stays; later ones point to it with duplicate_of_id and the detail
page lists them as "also on".
"""

import re
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Announcement

THRESHOLD = 0.6
WINDOW_DAYS = 30
# Words that start many Thai announcements and say nothing about which one it is.
_FILLER = re.compile(r"ประกาศ|ขอเชิญ(ชวน)?|เชิญชวน|รับสมัคร|เปิดรับ|มหาวิทยาลัยเชียงใหม่|มช\.?|คณะ|เรื่อง")
_THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")


def _norm(title: str) -> str:
    t = title.translate(_THAI_DIGITS).lower()
    t = _FILLER.sub("", t)
    return re.sub(r"[^\w]+", "", t)


def _numbers(title: str) -> set[str]:
    return set(re.findall(r"\d+", title.translate(_THAI_DIGITS)))


def _grams(s: str) -> set[str]:
    return {s[i : i + 3] for i in range(max(1, len(s) - 2))}


def similarity(a: str, b: str) -> float:
    ga, gb = _grams(_norm(a)), _grams(_norm(b))
    return len(ga & gb) / len(ga | gb) if ga and gb else 0.0


def same_announcement(a: Announcement, b: Announcement) -> bool:
    if a.source_id == b.source_id:
        return False
    if _numbers(a.title) != _numbers(b.title):
        return False  # "รอบที่ 1" vs "รอบที่ 2", different years
    if a.deadline and b.deadline and a.deadline != b.deadline:
        return False
    return similarity(a.title, b.title) >= THRESHOLD


async def merge_duplicates(session: AsyncSession, today: date) -> int:
    rows = list(
        (
            await session.scalars(
                select(Announcement)
                .where(
                    Announcement.duplicate_of_id.is_(None),
                    Announcement.needs_extraction.is_(False),
                    Announcement.first_seen_at >= today - timedelta(days=WINDOW_DAYS),
                )
                .order_by(Announcement.first_seen_at, Announcement.id)
            )
        ).all()
    )
    merged = 0
    for i, later in enumerate(rows):
        if later.duplicate_of_id is not None:
            continue
        for earlier in rows[:i]:
            if earlier.duplicate_of_id is None and same_announcement(earlier, later):
                later.duplicate_of_id = earlier.id
                # Keep what the copy knew that the original did not.
                earlier.deadline = earlier.deadline or later.deadline
                earlier.image_url = earlier.image_url or later.image_url
                merged += 1
                break
    await session.commit()
    return merged
