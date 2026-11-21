"""Decide who gets told what, and send it within the free LINE push quota.

Flow (run by the scheduler after each collect):
  1. plan_reminders  - deadline reminders 3 days and 1 day before, for users who pressed "เตือนฉัน"
  2. plan_digests    - one digest per user per day with new announcements that match them
  3. dispatch        - one push per user (all their queued items in one request, so it counts
                       as a single message), reminders first, while the monthly budget allows.
Anything not pushed stays queued and rides along on the user's next (free) reply message.
"""

import logging
import uuid
from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import BANGKOK, get_settings
from app.line import messages as msg
from app.line.client import LineApiError, LineClient
from app.models import Announcement, Delivery, Reminder, Source, User
from app.queries import user_matches, user_packs

log = logging.getLogger(__name__)

REMINDER_DAYS = {3: "reminder_3d", 1: "reminder_1d"}
QUEUE_TTL_DAYS = 14


async def _enqueue(
    session: AsyncSession, user_id: int, kind: str, ids: list[int], key: str
) -> bool:
    stmt = (
        insert(Delivery)
        .values(user_id=user_id, kind=kind, announcement_ids=ids, dedupe_key=key, status="queued")
        .on_conflict_do_nothing(index_elements=["dedupe_key"])
        .returning(Delivery.id)
    )
    return (await session.execute(stmt)).scalar() is not None


async def plan_reminders(session: AsyncSession, today: date) -> int:
    created = 0
    for days, kind in REMINDER_DAYS.items():
        rows = (
            await session.execute(
                select(Reminder.user_id, Announcement.id)
                .join(Announcement, Announcement.id == Reminder.announcement_id)
                .join(User, User.id == Reminder.user_id)
                .where(
                    Announcement.deadline == today + timedelta(days=days), User.blocked.is_(False)
                )
            )
        ).all()
        for user_id, ann_id in rows:
            created += await _enqueue(
                session, user_id, kind, [ann_id], f"{kind}:{user_id}:{ann_id}"
            )
    await session.commit()
    return created


async def plan_digests(session: AsyncSession, now: datetime) -> int:
    today = now.astimezone(BANGKOK).date()
    fresh = (
        await session.scalars(
            select(Announcement).where(
                Announcement.matched_at.is_(None),
                Announcement.needs_extraction.is_(False),
                Announcement.duplicate_of_id.is_(None),
                Announcement.moderation_status == "published",
            )
        )
    ).all()
    if not fresh:
        return 0
    users = (
        await session.scalars(select(User).where(User.notify_new, User.blocked.is_(False)))
    ).all()
    pack_of = dict((await session.execute(select(Source.id, Source.pack))).all())
    created = 0
    for u in users:
        packs = set(user_packs(u))
        ids = [
            a.id for a in fresh if pack_of.get(a.source_id) in packs and user_matches(u, a, today)
        ]
        if not ids:
            continue
        key = f"digest:{u.id}:{min(ids)}-{max(ids)}:{len(ids)}"
        created += await _enqueue(session, u.id, "digest", ids, key)
    for a in fresh:
        a.matched_at = now
    await session.commit()
    return created


@dataclass
class Budget:
    limit: int
    used: int
    reserve: int

    @property
    def remaining(self) -> int:
        return max(self.limit - self.used, 0)

    def can_push(self, kind: str) -> bool:
        if kind.startswith("reminder"):
            return self.remaining > 0
        return self.remaining > self.reserve


async def pushes_this_month(session: AsyncSession, today: date) -> int:
    start = datetime(today.year, today.month, 1, tzinfo=BANGKOK)
    # One push request = one message per recipient, however many items it holds.
    return (
        await session.scalar(
            select(
                func.count(func.distinct(func.concat(Delivery.user_id, ":", Delivery.sent_at)))
            ).where(Delivery.channel == "push", Delivery.sent_at >= start)
        )
        or 0
    )


async def reminders_due_rest_of_month(session: AsyncSession, today: date) -> int:
    end = date(today.year, today.month, monthrange(today.year, today.month)[1])
    total = 0
    for days in REMINDER_DAYS:
        total += (
            await session.scalar(
                select(func.count())
                .select_from(Reminder)
                .join(Announcement, Announcement.id == Reminder.announcement_id)
                .where(
                    Announcement.deadline > today + timedelta(days=days),
                    Announcement.deadline <= end + timedelta(days=days),
                )
            )
            or 0
        )
    return total


async def get_budget(session: AsyncSession, line: LineClient, today: date) -> Budget:
    s = get_settings()
    limit = s.push_monthly_limit
    used = await pushes_this_month(session, today)
    try:
        if (q := await line.quota()) is not None:
            limit = q
        if (c := await line.consumption()) is not None:
            used = max(used, c)  # LINE's own count also includes manual broadcasts from OA Manager
    except LineApiError:
        log.warning("could not read LINE quota; using local count")
    limit -= s.push_safety_margin
    reserve = max(
        await reminders_due_rest_of_month(session, today), int(limit * s.reminder_reserve_ratio)
    )
    return Budget(limit=limit, used=used, reserve=reserve)


def _retry_key(deliveries: list[Delivery]) -> str:
    return str(
        uuid.uuid5(uuid.NAMESPACE_URL, "pingkhana:" + ",".join(str(d.id) for d in deliveries))
    )


async def render(session: AsyncSession, deliveries: list[Delivery], today: date) -> list[dict]:
    """At most 4 LINE messages for a batch of deliveries (reply leaves one slot for the answer)."""
    out: list[dict] = []
    reminder_ids = [
        i for d in deliveries if d.kind.startswith("reminder") for i in d.announcement_ids
    ]
    digest_ids = [i for d in deliveries if d.kind == "digest" for i in d.announcement_ids]
    if reminder_ids:
        anns = (
            await session.scalars(
                select(Announcement)
                .where(Announcement.id.in_(reminder_ids))
                .order_by(Announcement.deadline)
            )
        ).all()
        lines = [
            f"⏰ {a.title[:60]} — ปิดรับ {msg.th_date(a.deadline)} ({msg.days_left_text(a.deadline, today)})"
            for a in anns
            if a.deadline
        ]
        if lines:
            out.append(msg.text("เตือนกำหนดส่ง\n" + "\n".join(lines), quick=False))
            out.append(msg.carousel("เตือนกำหนดส่ง", list(anns), today, set(reminder_ids)))
    if digest_ids:
        anns = (
            await session.scalars(
                select(Announcement)
                .where(Announcement.id.in_(digest_ids))
                .order_by(Announcement.deadline.asc().nulls_last(), Announcement.id.desc())
            )
        ).all()
        anns = [a for a in anns if a.deadline is None or a.deadline >= today]
        if anns:
            out.append(msg.carousel(f"ประกาศใหม่ที่ตรงกับคุณ {len(anns)} รายการ", list(anns), today))
    return out[:4]


async def dispatch(session: AsyncSession, line: LineClient, now: datetime) -> dict[str, int]:
    today = now.astimezone(BANGKOK).date()
    stats = {"pushed_users": 0, "kept_for_reply": 0, "expired": 0, "failed": 0}

    expired = (
        await session.scalars(
            select(Delivery).where(
                Delivery.status == "queued",
                Delivery.created_at < now - timedelta(days=QUEUE_TTL_DAYS),
            )
        )
    ).all()
    for d in expired:
        d.status = "expired"
    stats["expired"] = len(expired)

    queued = (
        await session.scalars(
            select(Delivery)
            .join(User)
            .where(Delivery.status == "queued", User.blocked.is_(False))
            .order_by(Delivery.id)
        )
    ).all()
    by_user: dict[int, list[Delivery]] = {}
    for d in queued:
        by_user.setdefault(d.user_id, []).append(d)

    budget = await get_budget(session, line, today)
    # Users with a reminder go first; they are what the reserve is for.
    order = sorted(
        by_user, key=lambda uid: not any(d.kind.startswith("reminder") for d in by_user[uid])
    )
    for uid in order:
        batch = by_user[uid]
        has_reminder = any(d.kind.startswith("reminder") for d in batch)
        if not budget.can_push("reminder" if has_reminder else "digest"):
            stats["kept_for_reply"] += 1
            continue
        user = await session.get(User, uid)
        assert user is not None
        messages = await render(session, batch, today)
        if not messages:
            for d in batch:
                d.status = "expired"
            continue
        try:
            await line.push(user.line_user_id, messages, _retry_key(batch))
        except LineApiError as e:
            if e.status in (429,) or e.status >= 500:
                stats["kept_for_reply"] += 1  # try again next run
                continue
            for d in batch:
                d.status, d.error = "failed", str(e)[:500]
            stats["failed"] += 1
            continue
        for d in batch:
            d.status, d.channel, d.sent_at = "sent", "push", now
        budget.used += 1
        stats["pushed_users"] += 1
    await session.commit()
    return stats


async def take_queued_for_reply(session: AsyncSession, user: User, now: datetime) -> list[dict]:
    """Queued items for this user, rendered for a reply, and marked as sent (free channel)."""
    today = now.astimezone(BANGKOK).date()
    batch = (
        await session.scalars(
            select(Delivery)
            .where(Delivery.user_id == user.id, Delivery.status == "queued")
            .order_by(Delivery.id)
        )
    ).all()
    if not batch:
        return []
    messages = await render(session, list(batch), today)
    for d in batch:
        d.status, d.channel, d.sent_at = "sent", "reply", now
    return messages[:3]
