"""Webhook event handling. Every answer is a reply message, which does not use the push quota."""

import logging
import re
from datetime import datetime
from urllib.parse import parse_qs

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import BANGKOK, get_settings
from app.line import messages as msg
from app.line.client import LineClient
from app.models import Announcement, Category, Reminder, User
from app.notify import take_queued_for_reply
from app.queries import closing_soon, latest_in_category, open_in_category

log = logging.getLogger(__name__)

HELP = (
    "PingKhana รวมประกาศทุน สหกิจ งาน และกิจกรรมจากเว็บคณะ/มหาวิทยาลัย\n\n"
    "พิมพ์คำสั่ง:\n"
    "• ทุนที่เปิดอยู่\n• สหกิจล่าสุด\n• งานล่าสุด\n• กิจกรรมล่าสุด\n• ใกล้ปิดรับ\n"
    "• เตือนของฉัน — ประกาศที่กดให้เตือน\n"
    "• ตั้งค่า — เลือกประเภท ชั้นปี สาขา\n"
    "• ยกเลิก — ลบข้อมูลของคุณทั้งหมด\n\n"
    f"{msg.DISCLAIMER}"
)


REMIND_TEXT = re.compile(r"(?:เตือนฉัน|เตือน)\s*#?(\d{1,9})")


def settings_link() -> str:
    s = get_settings()
    return f"https://liff.line.me/{s.liff_id}" if s.liff_id else f"{s.public_web_url}/liff"


async def get_or_create_user(session: AsyncSession, line_user_id: str) -> User:
    user = await session.scalar(select(User).where(User.line_user_id == line_user_id))
    if user is None:
        user = User(line_user_id=line_user_id)
        session.add(user)
        await session.flush()
    return user


async def _reminded_ids(session: AsyncSession, user: User) -> set[int]:
    return set(
        (
            await session.scalars(
                select(Reminder.announcement_id).where(Reminder.user_id == user.id)
            )
        ).all()
    )


async def _list_reply(
    session: AsyncSession, user: User, q, title: str, empty: str, today
) -> list[dict]:
    anns = list((await session.scalars(q)).all())
    if not anns:
        return [msg.text(empty)]
    return [msg.carousel(title, anns, today, await _reminded_ids(session, user))]


async def answer_text(session: AsyncSession, user: User, text: str, now: datetime) -> list[dict]:
    today = now.astimezone(BANGKOK).date()
    t = text.strip().lower()
    # "เตือน 123" is what the website's reminder button pre-fills in LINE.
    m = REMIND_TEXT.fullmatch(t)
    if m:
        return await handle_postback(session, user, f"action=remind&id={m.group(1)}", now)
    if t in ("ทุน", "ทุนที่เปิดอยู่", "ทุนเปิด"):
        return await _list_reply(
            session,
            user,
            open_in_category(Category.SCHOLARSHIP, today, user),
            "ทุนที่เปิดอยู่",
            "ตอนนี้ยังไม่พบทุนที่เปิดรับและตรงกับคุณ",
            today,
        )
    if t in ("สหกิจ", "สหกิจล่าสุด", "ฝึกงาน"):
        return await _list_reply(
            session,
            user,
            latest_in_category(Category.INTERNSHIP, today, user),
            "สหกิจ/ฝึกงานล่าสุด",
            "ยังไม่พบประกาศสหกิจหรือฝึกงานที่เปิดอยู่",
            today,
        )
    if t in ("งาน", "งานล่าสุด"):
        return await _list_reply(
            session,
            user,
            latest_in_category(Category.JOB, today, user),
            "งานล่าสุด",
            "ยังไม่พบประกาศรับสมัครงานที่เปิดอยู่",
            today,
        )
    if t in ("กิจกรรม", "กิจกรรมล่าสุด"):
        return await _list_reply(
            session,
            user,
            latest_in_category(Category.ACTIVITY, today, user),
            "กิจกรรมล่าสุด",
            "ยังไม่พบกิจกรรมที่เปิดอยู่",
            today,
        )
    if t in ("ใกล้ปิดรับ", "ใกล้ปิด", "deadline"):
        return await _list_reply(
            session,
            user,
            closing_soon(today, user),
            "ใกล้ปิดรับใน 14 วัน",
            "ไม่มีประกาศที่จะปิดรับใน 14 วันข้างหน้า",
            today,
        )
    if t in ("เตือนของฉัน", "เตือน"):
        anns = list(
            (
                await session.scalars(
                    select(Announcement)
                    .join(Reminder, Reminder.announcement_id == Announcement.id)
                    .where(Reminder.user_id == user.id, Announcement.deadline >= today)
                    .order_by(Announcement.deadline)
                )
            ).all()
        )
        if not anns:
            return [msg.text('ยังไม่มีประกาศที่ให้เตือน กด "เตือนฉัน" ใต้ประกาศที่สนใจได้เลย')]
        return [msg.carousel("ประกาศที่ให้เตือน", anns, today, {a.id for a in anns})]
    if t in ("ตั้งค่า", "setting", "settings"):
        return [msg.text(f"ตั้งค่าประเภทประกาศ ชั้นปี และสาขาได้ที่\n{settings_link()}")]
    if t in ("ยกเลิก", "unsubscribe", "ลบข้อมูล"):
        await session.execute(delete(User).where(User.id == user.id))
        return [
            msg.text(
                "ลบข้อมูลของคุณ (userId ชั้นปี สาขา และรายการเตือน) เรียบร้อยแล้ว จะไม่มีการแจ้งเตือนอีก\nถ้าอยากกลับมาใช้ พิมพ์อะไรก็ได้ หรือกดตั้งค่าใหม่",
                quick=False,
            )
        ]
    return [msg.text(HELP)]


async def handle_postback(
    session: AsyncSession, user: User, data: str, now: datetime
) -> list[dict]:
    today = now.astimezone(BANGKOK).date()
    params = {k: v[0] for k, v in parse_qs(data).items()}
    try:
        ann_id = int(params.get("id", ""))
    except ValueError:
        return [msg.text(HELP)]
    ann = await session.get(Announcement, ann_id)
    if ann is None:
        return [msg.text("ไม่พบประกาศนี้แล้ว")]
    action = params.get("action")
    if action == "remind":
        if ann.deadline is None or ann.deadline < today:
            return [
                msg.text("ประกาศนี้ไม่มีวันปิดรับที่ระบบอ่านได้ หรือปิดรับไปแล้ว โปรดดูที่ประกาศต้นทาง\n" + ann.url)
            ]
        exists = await session.scalar(
            select(Reminder.id).where(
                Reminder.user_id == user.id, Reminder.announcement_id == ann.id
            )
        )
        if exists is None:
            session.add(Reminder(user_id=user.id, announcement_id=ann.id))
        return [
            msg.text(
                f"ตั้งเตือนแล้ว: {ann.title[:80]}\nปิดรับ {msg.th_date(ann.deadline)} — จะเตือนก่อนปิดรับ 3 วันและ 1 วัน\n"
                "(ตรวจวันปิดรับที่ประกาศต้นทางด้วยนะ ระบบอ่านจากเว็บอัตโนมัติ)"
            )
        ]
    if action == "unremind":
        await session.execute(
            delete(Reminder).where(Reminder.user_id == user.id, Reminder.announcement_id == ann.id)
        )
        return [msg.text(f"ยกเลิกเตือนแล้ว: {ann.title[:80]}")]
    return [msg.text(HELP)]


async def handle_event(session: AsyncSession, line: LineClient, event: dict, now: datetime) -> None:
    source = event.get("source", {})
    line_user_id = source.get("userId")
    etype = event.get("type")
    if not line_user_id or source.get("type") != "user":
        return  # groups and rooms are out of scope

    if etype == "unfollow":
        # Blocked: keep nothing about the user.
        await session.execute(delete(User).where(User.line_user_id == line_user_id))
        await session.commit()
        return

    reply_token = event.get("replyToken")
    if not reply_token:
        return
    user = await get_or_create_user(session, line_user_id)
    user.last_seen_at = now
    user.blocked = False

    if etype == "follow":
        answer = [
            msg.text(
                "สวัสดี! PingKhana จะช่วยแจ้งประกาศทุน สหกิจ งาน และเตือนกำหนดส่งให้\n"
                f"เริ่มจากตั้งค่าประเภทที่สนใจ ชั้นปี และสาขา: {settings_link()}\n\n{HELP}"
            )
        ]
    elif etype == "message" and event.get("message", {}).get("type") == "text":
        answer = await answer_text(session, user, event["message"]["text"], now)
    elif etype == "postback":
        answer = await handle_postback(
            session, user, event.get("postback", {}).get("data", ""), now
        )
    else:
        answer = [msg.text(HELP)]

    deleted = (
        await session.scalar(select(func.count()).select_from(User).where(User.id == user.id)) == 0
    )
    extra = [] if deleted else await take_queued_for_reply(session, user, now)
    await line.reply(reply_token, (answer + extra)[:5])
    await session.commit()
