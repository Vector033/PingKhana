from datetime import timedelta

import httpx
import pytest
from sqlalchemy import select

from app.collector.dedupe import merge_duplicates, similarity
from app.main import app
from app.models import Announcement, Source
from tests import factories as f


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c


def test_similarity_and_numbers() -> None:
    a = "สพฐ. ร่วมเวที FutureEd Fest 2026 แลกเปลี่ยนแนวคิดการศึกษายุค AI"
    b = "สพฐ. ร่วมเวที FutureEd Fest 2026 แลกเปลี่ยนแนวคิดการศึกษา มุ่งพัฒนา"
    assert similarity(a, b) > 0.6
    assert similarity(a, "ประกาศรับสมัครทุนเรียนดี") < 0.2


async def test_reposts_from_another_site_merge_into_the_first(session, client) -> None:
    session.add(Source(id="other", name="เว็บอื่น", url="https://other.example/", pack="teacher"))
    await session.flush()
    first = await f.announcement(
        session, title="ประกาศรับสมัครครูผู้ช่วย รอบที่ 1 ปี 2570", deadline=f.TODAY + timedelta(days=9)
    )
    repost = await f.announcement(session, title="รับสมัครครูผู้ช่วย รอบที่ 1 ปี 2570")
    repost.source_id, repost.deadline = "other", f.TODAY + timedelta(days=9)
    round2 = await f.announcement(session, title="ประกาศรับสมัครครูผู้ช่วย รอบที่ 2 ปี 2570")
    round2.source_id = "other"
    same_site = await f.announcement(session, title="ประกาศรับสมัครครูผู้ช่วย รอบที่ 1 ปี 2570")
    for a in (first, repost, round2, same_site):
        a.first_seen_at = f.NOW
    repost.first_seen_at = f.NOW + timedelta(hours=1)
    await session.commit()

    assert await merge_duplicates(session, f.TODAY) == 1
    rows = {a.id: a for a in (await session.scalars(select(Announcement))).all()}
    assert rows[repost.id].duplicate_of_id == first.id
    assert rows[round2.id].duplicate_of_id is None  # different round number
    assert rows[same_site.id].duplicate_of_id is None  # same source: not a cross-post

    body = (await client.get(f"/api/announcements/{repost.id}")).json()
    assert body["id"] == first.id
    assert body["also_on"] == [{"source_name": "เว็บอื่น", "url": repost.url}]
