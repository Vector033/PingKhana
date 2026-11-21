"""Social feeds: bridge parsing, the two-stage gate, and the admin queue."""

import json

import httpx
import pytest
import respx
from sqlalchemy import select

from app.collector.fetcher import PoliteFetcher
from app.collector.parsers import parse_social
from app.collector.pipeline import collect_source, sync_sources
from app.collector.sources import SourceConfig
from app.extract import gatekeeper
from app.extract.schema import Extracted
from app.extract.service import apply
from app.main import app
from app.models import Announcement, Category, Source
from app.queries import visible
from tests import factories as f
from tests.factories import NOW

BRIDGE = "https://rsshub.example.org"
CFG = SourceConfig.model_validate(
    {
        "id": "fb-hr",
        "name": "เพจรับสมัครงานตัวอย่าง",
        "url": f"{BRIDGE}/facebook/page/hr.example",
        "kind": "social_feed",
        "platform": "facebook",
    }
)

FEED = {
    "version": "https://jsonfeed.org/version/1.1",
    "items": [
        {
            "url": "https://www.facebook.com/hr.example/posts/1",
            "content_text": "บริษัทตัวอย่าง จำกัด รับสมัคร Junior Data Analyst 2 อัตรา\nส่ง resume ภายใน 30 พ.ย. 2569",
            "image": "https://cdn.example.org/poster1.jpg",
            "date_published": "2026-10-01T09:00:00+07:00",
        },
        {
            "url": "https://www.facebook.com/hr.example/posts/2",
            "content_text": "งานออนไลน์ทำที่บ้าน รายได้หลักหมื่นต่อวัน ทักแชทเลย",
        },
        {
            "url": "https://www.facebook.com/hr.example/posts/3",
            "content_text": "หางานครับ จบใหม่สาขาคอมพิวเตอร์ ถนัด Python ฝากด้วยครับ",
        },
    ],
}


def fetcher() -> PoliteFetcher:
    return PoliteFetcher("test-bot", delay_seconds=0, retries=0)


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c


# ---------- parsing


def test_json_feed_and_rss_bridges_parse_captions_as_posts() -> None:
    items = parse_social(json.dumps(FEED))
    assert len(items) == 3
    assert items[0].title.startswith("บริษัทตัวอย่าง จำกัด รับสมัคร")
    assert "resume" in items[0].body and items[0].image == "https://cdn.example.org/poster1.jpg"
    assert str(items[0].published_on) == "2026-10-01"

    rss = """<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
    <item><title></title><link>https://www.instagram.com/p/abc/</link>
    <description><![CDATA[<p>ประกาศรับสมัครนักศึกษาฝึกงาน ฝ่ายการตลาด</p><img src="http://cdn.example.org/a.jpg">]]></description>
    <pubDate>Mon, 02 Nov 2026 10:00:00 +0700</pubDate></item></channel></rss>"""
    [post] = parse_social(rss)
    assert post.title == "ประกาศรับสมัครนักศึกษาฝึกงาน ฝ่ายการตลาด"
    assert post.image == "https://cdn.example.org/a.jpg"


def test_long_caption_title_is_cut_at_a_space() -> None:
    caption = "รับสมัคร " + "ตำแหน่งเจ้าหน้าที่ประสานงานโครงการ " * 6
    [post] = parse_social(
        json.dumps({"items": [{"url": "https://x.example/1", "content_text": caption}]})
    )
    assert len(post.title) <= 91 and post.title.endswith("…")


# ---------- stage 1


@pytest.mark.parametrize(
    "text,intent",
    [
        ("งานออนไลน์ทำที่บ้าน รายได้หลักหมื่นต่อวัน", "spam_or_scam"),
        ("ฝากร้านด้วยนะคะ เสื้อผ้ามือสอง", "spam_or_scam"),
        ("หางานครับ จบใหม่ ถนัด Excel", "job_seeker"),
        ("หาที่ฝึกงานด้าน UX ค่ะ ปี 3", "job_seeker"),
    ],
)
def test_stage1_drops_obvious_posts(text, intent) -> None:
    assert gatekeeper.prefilter(text)[0] == intent


def test_stage1_keeps_hiring_posts_that_mention_new_graduates() -> None:
    assert gatekeeper.prefilter("จบใหม่ก็สมัครได้! บริษัทเปิดรับ Junior Dev 3 อัตรา") is None
    assert gatekeeper.prefilter("ใครหางานอยู่ ทีมเรากำลังรับสมัคร Barista ค่ะ") is None


# ---------- stage 2


def ans(**kw) -> Extracted:
    return Extracted(category=Category.JOB, summary_th="สรุป", method="gemini:x", **kw)


@pytest.mark.parametrize(
    "kw,status",
    [
        ({"post_intent": "hiring_post", "is_publishable": True, "confidence": 0.9}, "published"),
        (
            {"post_intent": "job_seeker", "is_publishable": False, "confidence": 0.95},
            "filtered_out",
        ),
        (
            {"post_intent": "hiring_post", "is_publishable": True, "confidence": 0.5},
            "pending_review",
        ),
        (
            {"post_intent": "hiring_post", "is_publishable": False, "confidence": 0.9},
            "pending_review",
        ),
        ({}, "pending_review"),
    ],
)
def test_stage2_decision(kw, status) -> None:
    assert gatekeeper.decide(ans(**kw))[0] == status


def test_apply_gates_only_pending_social_posts() -> None:
    social = Announcement(moderation_status="pending_review")
    apply(
        social,
        ans(
            post_intent="job_seeker",
            is_publishable=False,
            confidence=0.9,
            rejection_reason="คนหางาน",
        ),
    )
    assert (social.moderation_status, social.post_intent, social.rejection_reason) == (
        "filtered_out",
        "job_seeker",
        "คนหางาน",
    )
    # A rule result cannot judge intent: the post keeps waiting.
    waiting = Announcement(moderation_status="pending_review")
    apply(waiting, Extracted(category=Category.JOB, summary_th="s", method="rules"))
    assert waiting.moderation_status == "pending_review"
    # Web posts and admin-approved posts are never re-gated.
    web = Announcement(moderation_status="published")
    apply(web, ans(post_intent="job_seeker", is_publishable=False, confidence=0.99))
    assert web.moderation_status == "published"


# ---------- collection


async def test_collect_social_feed_gates_without_opening_facebook(session) -> None:
    await sync_sources(session, [CFG])
    with respx.mock(assert_all_called=False) as router:
        router.get(f"{BRIDGE}/robots.txt").respond(404)
        router.get(CFG.url).respond(200, json=FEED)
        fb = router.get(url__startswith="https://www.facebook.com/").respond(200, html="nope")
        r = await collect_source(session, CFG, fetcher(), NOW)
    assert r.status == "ok" and r.new == 3
    assert fb.call_count == 0
    rows = {a.url[-1]: a for a in (await session.scalars(select(Announcement))).all()}
    assert (rows["1"].moderation_status, rows["1"].needs_extraction) == ("pending_review", True)
    assert rows["2"].moderation_status == "filtered_out" and rows["2"].post_intent == "spam_or_scam"
    assert rows["3"].moderation_status == "filtered_out" and rows["3"].post_intent == "job_seeker"
    assert not rows["2"].needs_extraction
    assert (await session.scalars(visible())).all() == []
    src = await session.get(Source, "fb-hr")
    assert src.platform == "facebook"


# ---------- admin queue and public visibility


async def test_admin_queue_approve_and_reject(session, client, monkeypatch) -> None:
    from app import main

    monkeypatch.setattr(main.get_settings(), "jobs_token", "t")
    auth = {"Authorization": "Bearer t"}
    held = await f.announcement(session, title="รับสมัครพนักงาน (รอตรวจ)")
    held.moderation_status, held.rejection_reason = "pending_review", "AI ไม่แน่ใจ"
    dropped = await f.announcement(session, title="หางานครับ")
    dropped.moderation_status, dropped.post_intent = "filtered_out", "job_seeker"
    dropped.extraction_method = None
    await session.commit()

    assert (await client.get(f"/api/announcements/{held.id}")).status_code == 404
    assert (await client.get("/api/announcements")).json()["total"] == 0
    assert (await client.get("/api/admin/moderation")).status_code == 401
    queue = (await client.get("/api/admin/moderation", headers=auth)).json()
    assert [q["title"] for q in queue] == ["รับสมัครพนักงาน (รอตรวจ)"]
    gone = (
        await client.get("/api/admin/moderation", params={"status": "filtered_out"}, headers=auth)
    ).json()
    assert gone[0]["post_intent"] == "job_seeker"
    assert (await client.get("/api/admin/overview", headers=auth)).json()["pending_posts"] == 1

    r = await client.post(f"/api/admin/moderation/{held.id}/approve", headers=auth)
    assert r.json()["moderation_status"] == "published"
    assert (await client.get(f"/api/announcements/{held.id}")).status_code == 200
    await client.post(f"/api/admin/moderation/{dropped.id}/approve", headers=auth)
    await session.refresh(dropped)
    # Approved after a Stage 1 drop: it still needs Gemini's summary.
    assert dropped.moderation_status == "published" and dropped.needs_extraction
    r = await client.post(f"/api/admin/moderation/{held.id}/reject", headers=auth)
    assert r.json()["moderation_status"] == "filtered_out"


async def test_social_posts_carry_their_platform(session, client) -> None:
    session.add(
        Source(id="ig", name="IG ตัวอย่าง", url="https://instagram.com/x", platform="instagram")
    )
    await session.flush()
    a = await f.announcement(session, title="รับสมัครฝึกงาน")
    a.source_id = "ig"
    await f.announcement(session, title="ข่าวเว็บ")
    await session.commit()
    items = {i["title"]: i for i in (await client.get("/api/announcements")).json()["items"]}
    assert items["รับสมัครฝึกงาน"]["platform"] == "instagram"
    assert items["ข่าวเว็บ"]["platform"] is None
