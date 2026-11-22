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
    merged = merge_rows(rows)
    await session.commit()
    return merged


def merge_rows(rows: list[Announcement]) -> int:
    """Point each repost at its earliest copy; `rows` oldest first. Returns how many merged.

    Each title is normalised once, and a post is compared only with earlier posts carrying the
    same numbers ("รอบที่ 1" vs "รอบที่ 2", different years never match). The old all-pairs loop
    redid both per pair: ~4 s for 600 posts on a laptop, long enough on Render's small CPU to
    miss the 5 s health check every hourly run.
    """
    by_numbers: dict[frozenset[str], list[tuple[Announcement, set[str]]]] = {}
    merged = 0
    for later in rows:
        grams = _grams(_norm(later.title))
        earlier_rows = by_numbers.setdefault(frozenset(_numbers(later.title)), [])
        for earlier, earlier_grams in earlier_rows:
            if (
                earlier.source_id != later.source_id
                and not (earlier.deadline and later.deadline and earlier.deadline != later.deadline)
                and grams
                and earlier_grams
                and len(grams & earlier_grams) / len(grams | earlier_grams) >= THRESHOLD
            ):
                later.duplicate_of_id = earlier.id
                # Keep what the copy knew that the original did not.
                earlier.deadline = earlier.deadline or later.deadline
                earlier.image_url = earlier.image_url or later.image_url
                merged += 1
                break
        else:
            earlier_rows.append((later, grams))
    return merged
