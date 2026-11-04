from datetime import timedelta

from sqlalchemy import select

from app import notify
from app.line.client import LineClient
from app.models import Category, Delivery, Reminder
from tests import factories as f


async def test_reminders_fire_3_and_1_days_before_and_only_once(session) -> None:
    u = await f.user(session, "U1")
    a = await f.announcement(session, deadline=f.TODAY + timedelta(days=3))
    session.add(Reminder(user_id=u.id, announcement_id=a.id))
    await session.commit()

    assert await notify.plan_reminders(session, f.TODAY) == 1
    assert await notify.plan_reminders(session, f.TODAY) == 0  # idempotent
    assert await notify.plan_reminders(session, f.TODAY + timedelta(days=1)) == 0  # 2 days before
    assert await notify.plan_reminders(session, f.TODAY + timedelta(days=2)) == 1  # 1 day before
    kinds = sorted((await session.scalars(select(Delivery.kind))).all())
    assert kinds == ["reminder_1d", "reminder_3d"]


async def test_digest_matches_category_year_and_major(session) -> None:
    cs3 = await f.user(
        session, "U-cs3", year=3, major="cs", categories=["scholarship", "internship"]
    )
    bio1 = await f.user(session, "U-bio1", year=1, major="biology", categories=["scholarship"])
    await f.announcement(session, title="ทุน CS ปี 3-4", years=[3, 4], majors=["cs"], matched=False)
    await f.announcement(session, title="ทุนทุกคน", matched=False)
    await f.announcement(session, title="กิจกรรม", category=Category.ACTIVITY, matched=False)
    await session.commit()

    assert await notify.plan_digests(session, f.NOW) == 2
    assert await notify.plan_digests(session, f.NOW) == 0  # announcements are now matched
    by_user = {d.user_id: d for d in (await session.scalars(select(Delivery))).all()}
    assert len(by_user[cs3.id].announcement_ids) == 2
    assert len(by_user[bio1.id].announcement_ids) == 1


async def test_dispatch_sends_one_push_per_user_and_counts_budget(session) -> None:
    u = await f.user(session, "U1")
    a = await f.announcement(session, deadline=f.TODAY + timedelta(days=1))
    b = await f.announcement(session, deadline=f.TODAY + timedelta(days=20))
    session.add_all(
        [
            Delivery(user_id=u.id, kind="reminder_1d", announcement_ids=[a.id], dedupe_key="r"),
            Delivery(user_id=u.id, kind="digest", announcement_ids=[b.id], dedupe_key="d"),
        ]
    )
    await session.commit()
    line = LineClient()
    stats = await notify.dispatch(session, line, f.NOW)
    assert stats["pushed_users"] == 1
    assert len(line.outbox) == 1 and line.outbox[0].kind == "push"
    assert await notify.pushes_this_month(session, f.TODAY) == 1


async def test_without_budget_digests_wait_for_reply_but_reminders_go(session, monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "push_monthly_limit", 22)  # 2 after the safety margin
    reminded = await f.user(session, "U-r")
    plain = await f.user(session, "U-d")
    a = await f.announcement(session, deadline=f.TODAY + timedelta(days=1))
    session.add_all(
        [
            Delivery(
                user_id=reminded.id, kind="reminder_1d", announcement_ids=[a.id], dedupe_key="r"
            ),
            Delivery(user_id=plain.id, kind="digest", announcement_ids=[a.id], dedupe_key="d"),
        ]
    )
    await session.commit()
    line = LineClient()
    stats = await notify.dispatch(session, line, f.NOW)
    # Reserve for reminders (50% of 2 = 1): after the reminder only 1 is left, which is kept.
    assert stats == {"pushed_users": 1, "kept_for_reply": 1, "expired": 0, "failed": 0}
    assert [r.to for r in line.outbox] == ["U-r"]


async def test_old_queued_items_expire(session) -> None:
    u = await f.user(session, "U1")
    a = await f.announcement(session)
    d = Delivery(
        user_id=u.id,
        kind="digest",
        announcement_ids=[a.id],
        dedupe_key="old",
        created_at=f.NOW - timedelta(days=30),
    )
    session.add(d)
    await session.commit()
    stats = await notify.dispatch(session, LineClient(), f.NOW)
    await session.refresh(d)
    assert stats["expired"] == 1 and d.status == "expired"
