from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import BANGKOK
from app.models import Announcement, Category, Source, User

NOW = datetime(2026, 10, 1, 9, 0, tzinfo=BANGKOK)
TODAY = NOW.date()

_n = 0


async def source(session: AsyncSession, sid: str = "test-src") -> Source:
    src = await session.get(Source, sid)
    if src is None:
        src = Source(id=sid, name="แหล่งทดสอบ", url=f"https://example.ac.th/{sid}")
        session.add(src)
        await session.flush()
    return src


async def announcement(
    session: AsyncSession,
    *,
    title: str = "ประกาศทุน",
    category: Category = Category.SCHOLARSHIP,
    deadline: date | None = None,
    years: list[int] | None = None,
    majors: list[str] | None = None,
    matched: bool = True,
) -> Announcement:
    global _n
    _n += 1
    await source(session)
    a = Announcement(
        source_id="test-src",
        url=f"https://example.ac.th/post/{_n}",
        title=title,
        body_text=f"{title} รายละเอียด",
        content_hash=f"hash-{_n}",
        category=category.value,
        summary_th=f"สรุป {title}",
        deadline=deadline,
        eligible_years=years,
        eligible_majors=majors,
        needs_extraction=False,
        first_seen_at=NOW,
        last_seen_at=NOW,
        matched_at=NOW if matched else None,
    )
    session.add(a)
    await session.flush()
    return a


async def user(session: AsyncSession, uid: str = "U-test", **kw) -> User:
    u = User(line_user_id=uid, **kw)
    session.add(u)
    await session.flush()
    return u
