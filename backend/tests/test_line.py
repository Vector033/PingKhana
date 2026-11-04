import base64
import hashlib
import hmac
import json
from datetime import timedelta

import httpx
from sqlalchemy import func, select

from app.line.client import LineClient, verify_signature
from app.line.handlers import handle_event
from app.main import app
from app.models import Category, Delivery, Reminder, User
from tests import factories as f


def ev(
    kind: str = "message", text: str | None = None, data: str | None = None, uid: str = "U1"
) -> dict:
    e: dict = {"type": kind, "replyToken": "rt", "source": {"type": "user", "userId": uid}}
    if text is not None:
        e["message"] = {"type": "text", "text": text}
    if data is not None:
        e["postback"] = {"data": data}
    return e


def all_text(messages: list[dict]) -> str:
    return json.dumps(messages, ensure_ascii=False)


def test_signature() -> None:
    body = b'{"events":[]}'
    sig = base64.b64encode(hmac.new(b"s3cret", body, hashlib.sha256).digest()).decode()
    assert verify_signature("s3cret", body, sig)
    assert not verify_signature("s3cret", body + b" ", sig)


async def test_webhook_rejects_bad_signature() -> None:
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/webhook", content=b'{"events":[]}', headers={"x-line-signature": "nope"})
        assert r.status_code == 401
        body = b'{"events":[]}'
        sig = base64.b64encode(hmac.new(b"test-secret", body, hashlib.sha256).digest()).decode()
        r = await c.post("/webhook", content=body, headers={"x-line-signature": sig})
        assert r.status_code == 200


async def test_open_scholarships_command_replies_with_source_link_and_disclaimer(session) -> None:
    await f.announcement(session, title="ทุนเปิด", deadline=f.TODAY + timedelta(days=5))
    await f.announcement(session, title="ทุนปิดแล้ว", deadline=f.TODAY - timedelta(days=1))
    await f.announcement(
        session, title="สหกิจ", category=Category.INTERNSHIP, deadline=f.TODAY + timedelta(days=5)
    )
    await session.commit()
    line = LineClient()
    await handle_event(session, line, ev(text="ทุนที่เปิดอยู่"), f.NOW)
    [sent] = line.outbox
    out = all_text(sent.messages)
    assert sent.kind == "reply"
    assert "ทุนเปิด" in out and "ทุนปิดแล้ว" not in out and "สหกิจ" not in out.split("quickReply")[0]
    assert "https://example.ac.th/post/" in out
    assert "ไม่ใช่ช่องทางทางการ" in out


async def test_commands_respect_year(session) -> None:
    await f.announcement(session, title="ทุนปี 4", deadline=f.TODAY + timedelta(days=3), years=[4])
    await f.user(session, "U1", year=2)
    await session.commit()
    line = LineClient()
    await handle_event(session, line, ev(text="ใกล้ปิดรับ"), f.NOW)
    assert "ทุนปี 4" not in all_text(line.outbox[0].messages)


async def test_remind_postback_creates_one_reminder(session) -> None:
    a = await f.announcement(session, deadline=f.TODAY + timedelta(days=10))
    await session.commit()
    line = LineClient()
    for _ in range(2):
        await handle_event(session, line, ev("postback", data=f"action=remind&id={a.id}"), f.NOW)
    assert await session.scalar(select(func.count()).select_from(Reminder)) == 1
    assert "ตั้งเตือนแล้ว" in all_text(line.outbox[-1].messages)
    await handle_event(session, line, ev("postback", data=f"action=unremind&id={a.id}"), f.NOW)
    assert await session.scalar(select(func.count()).select_from(Reminder)) == 0


async def test_remind_without_deadline_is_refused(session) -> None:
    a = await f.announcement(session, deadline=None)
    await session.commit()
    line = LineClient()
    await handle_event(session, line, ev("postback", data=f"action=remind&id={a.id}"), f.NOW)
    assert await session.scalar(select(func.count()).select_from(Reminder)) == 0


async def test_cancel_deletes_all_user_data(session) -> None:
    a = await f.announcement(session, deadline=f.TODAY + timedelta(days=10))
    await session.commit()
    line = LineClient()
    await handle_event(session, line, ev("postback", data=f"action=remind&id={a.id}"), f.NOW)
    await handle_event(session, line, ev(text="ยกเลิก"), f.NOW)
    assert await session.scalar(select(func.count()).select_from(User)) == 0
    assert await session.scalar(select(func.count()).select_from(Reminder)) == 0
    assert "ลบข้อมูล" in all_text(line.outbox[-1].messages)


async def test_unfollow_deletes_user(session) -> None:
    line = LineClient()
    await handle_event(session, line, ev("follow"), f.NOW)
    assert await session.scalar(select(func.count()).select_from(User)) == 1
    await handle_event(
        session, line, {"type": "unfollow", "source": {"type": "user", "userId": "U1"}}, f.NOW
    )
    assert await session.scalar(select(func.count()).select_from(User)) == 0


async def test_reply_carries_queued_items(session) -> None:
    u = await f.user(session, "U1")
    a = await f.announcement(session, title="ทุนที่รอส่ง", deadline=f.TODAY + timedelta(days=9))
    session.add(Delivery(user_id=u.id, kind="digest", announcement_ids=[a.id], dedupe_key="k1"))
    await session.commit()
    line = LineClient()
    await handle_event(session, line, ev(text="สวัสดี"), f.NOW)
    out = all_text(line.outbox[0].messages)
    assert "ทุนที่รอส่ง" in out
    d = await session.scalar(select(Delivery))
    await session.refresh(d)
    assert (d.status, d.channel) == ("sent", "reply")
