from datetime import timedelta

import httpx
import pytest
from sqlalchemy import func, select

from app.main import app
from app.models import Category, Reminder, User
from tests import factories as f


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c


DEV = {"Authorization": "Bearer dev:U-api"}


async def test_list_filters_and_search(session, client) -> None:
    from datetime import datetime

    from app.config import BANGKOK

    today = datetime.now(tz=BANGKOK).date()
    await f.announcement(
        session, title="ทุนเปิด Python", deadline=today + timedelta(days=5), years=[3]
    )
    await f.announcement(session, title="ทุนปิดแล้ว", deadline=today - timedelta(days=5))
    internship = await f.announcement(session, title="สหกิจ", category=Category.INTERNSHIP)
    # Undated posts count as open only while recent; the API compares with the real clock.
    internship.first_seen_at = datetime.now(tz=BANGKOK)
    await session.commit()

    r = (await client.get("/api/announcements")).json()
    assert r["total"] == 3
    r = (await client.get("/api/announcements", params={"status": "open"})).json()
    assert {a["title"] for a in r["items"]} == {"ทุนเปิด Python", "สหกิจ"}
    r = (await client.get("/api/announcements", params={"q": "python"})).json()
    assert [a["title"] for a in r["items"]] == ["ทุนเปิด Python"]
    r = (
        await client.get("/api/announcements", params={"year": 2, "category": "scholarship"})
    ).json()
    assert [a["title"] for a in r["items"]] == ["ทุนปิดแล้ว"]
    r = (await client.get("/api/announcements", params={"status": "closing"})).json()
    assert r["total"] == 1
    item = r["items"][0]
    assert item["category_th"] == "ทุน" and "body_text" not in item


async def test_detail_404(client) -> None:
    assert (await client.get("/api/announcements/999")).status_code == 404


async def test_liff_prefs_roundtrip_and_delete(session, client) -> None:
    a = await f.announcement(session, deadline=f.TODAY + timedelta(days=4000))
    await session.commit()
    assert (await client.get("/api/liff/me")).status_code == 401

    me = (await client.get("/api/liff/me", headers=DEV)).json()
    assert "scholarship" in me["categories"] and me["year"] is None

    body = {"year": 3, "major": "cs", "categories": ["scholarship"], "notify_new": False}
    assert (await client.put("/api/liff/me", json=body, headers=DEV)).status_code == 200
    assert (
        await client.put("/api/liff/me", json={**body, "major": "nope"}, headers=DEV)
    ).status_code == 422
    assert (await client.post(f"/api/liff/reminders/{a.id}", headers=DEV)).status_code == 204

    me = (await client.get("/api/liff/me", headers=DEV)).json()
    assert (me["year"], me["major"], me["notify_new"]) == (3, "cs", False)
    assert [r["id"] for r in me["reminders"]] == [a.id]

    assert (await client.delete("/api/liff/me", headers=DEV)).status_code == 204
    assert await session.scalar(select(func.count()).select_from(User)) == 0
    assert await session.scalar(select(func.count()).select_from(Reminder)) == 0


async def test_jobs_endpoint_needs_token(client) -> None:
    assert (await client.post("/jobs/run")).status_code == 401
    assert (
        await client.post("/jobs/run", headers={"Authorization": "Bearer wrong"})
    ).status_code == 401


async def test_stats_counts_extraction_methods(session, client) -> None:
    for method in ("gemini:gemini-flash-latest", "gemini:gemini-flash-lite-latest", "rules"):
        a = await f.announcement(session)
        a.extraction_method = method
    await session.commit()
    r = (await client.get("/api/stats")).json()
    assert r["extraction"] == {"gemini": 2, "rules": 1}


async def test_jobs_background_mode_returns_at_once(client, monkeypatch) -> None:
    from app import main

    monkeypatch.setattr(main.get_settings(), "jobs_token", "t")
    calls = []

    async def fake_run_all() -> dict:
        calls.append(1)
        return {"collect": [], "extracted": {}, "notify": {}}

    monkeypatch.setattr(main.jobs, "run_all", fake_run_all)
    auth = {"Authorization": "Bearer t"}
    r = await client.post("/jobs/run", params={"background": "1"}, headers=auth)
    assert r.json()["status"] == "started"
    # ASGITransport runs background tasks before returning; the result is recorded.
    assert calls == [1]
    last = (await client.get("/jobs/last", headers=auth)).json()
    assert last["ok"] is True


async def test_kind_and_pack_filters(session, client) -> None:
    from app.models import Source

    await f.announcement(session, title="ทุน ป.ตรี", category=Category.SCHOLARSHIP)
    await f.announcement(session, title="ข่าวแสดงความยินดี", category=Category.GENERAL)
    session.add(Source(id="moe", name="ศธ.", url="https://www.moe.go.th/", pack="teacher"))
    await session.flush()
    t = await f.announcement(session, title="ข่าว ศธ.", category=Category.GENERAL)
    t.source_id = "moe"
    await session.commit()

    titles = lambda r: {a["title"] for a in r.json()["items"]}  # noqa: E731
    assert titles(await client.get("/api/announcements", params={"kind": "open"})) == {"ทุน ป.ตรี"}
    assert titles(await client.get("/api/announcements", params={"kind": "news"})) == {
        "ข่าวแสดงความยินดี",
        "ข่าว ศธ.",
    }
    assert titles(await client.get("/api/announcements", params={"pack": "teacher"})) == {"ข่าว ศธ."}
    meta = (await client.get("/api/meta")).json()
    assert {"id": "teacher", "th": "ครู / การศึกษา"} in meta["packs"]


async def test_prefs_packs_roundtrip_and_validation(client, monkeypatch) -> None:
    from app import main

    monkeypatch.setattr(main.get_settings(), "line_login_channel_id", "")
    body = {"year": 3, "major": None, "categories": ["scholarship"], "notify_new": True}
    r = await client.put(
        "/api/liff/me", json={**body, "packs": ["teacher", "student"]}, headers=DEV
    )
    assert r.status_code == 200
    assert (await client.get("/api/liff/me", headers=DEV)).json()["packs"] == ["teacher", "student"]
    r = await client.put("/api/liff/me", json={**body, "packs": ["aliens"]}, headers=DEV)
    assert r.status_code == 422


async def test_submitted_source_waits_for_admin_then_gets_collected(
    session, client, monkeypatch
) -> None:
    from app import main
    from app.collector import discover
    from app.collector.pipeline import user_source_configs

    async def ok(url):
        return None

    monkeypatch.setattr(discover, "ensure_public", ok)
    monkeypatch.setattr(main.get_settings(), "jobs_token", "t")
    body = {
        "kind": "rss",
        "url": "https://school.example.org/feed/",
        "homepage": "https://school.example.org/",
        "name": "โรงเรียนตัวอย่าง",
        "pack": "teacher",
        "org": "สพป.ตัวอย่าง",
        "preview": [{"title": "ข่าว", "url": "https://school.example.org/1"}],
    }
    r = await client.post("/api/sources", json=body)
    assert r.status_code == 201 and r.json()["status"] == "pending"
    sid = r.json()["id"]
    # Hidden until approved, and submitting again does not duplicate it.
    assert sid not in {s["id"] for s in (await client.get("/api/meta")).json()["sources"]}
    assert (await client.post("/api/sources", json=body)).json()["status"] == "exists"
    assert await user_source_configs(session) == []

    assert (await client.post(f"/api/admin/sources/{sid}/approve", json={})).status_code == 401
    auth = {"Authorization": "Bearer t"}
    r = await client.post(
        f"/api/admin/sources/{sid}/approve", json={"pack": "general"}, headers=auth
    )
    assert r.json()["status"] == "approved"
    cfgs = await user_source_configs(session)
    assert [(c.id, c.kind, c.url, c.pack) for c in cfgs] == [
        (sid, "rss", "https://school.example.org/feed/", "general")
    ]
    rows = (await client.get("/api/admin/sources", headers=auth)).json()
    assert {r["id"]: r["org"] for r in rows}[sid] == "สพป.ตัวอย่าง"
    pending = (await client.get("/api/admin/overview", headers=auth)).json()["pending_sources"]
    assert pending == 0


async def test_tags_endpoint_and_filter(session, client) -> None:
    a = await f.announcement(session, title="ทุน ญี่ปุ่น")
    a.tags = ["ทุนต่างประเทศ", "ญี่ปุ่น"]
    b = await f.announcement(session, title="ทุน เกาหลี")
    b.tags = ["ทุนต่างประเทศ"]
    await f.announcement(session, title="ไม่มีแท็ก")
    await session.commit()
    top = (await client.get("/api/tags")).json()
    assert top[0] == {"tag": "ทุนต่างประเทศ", "count": 2}
    r = (await client.get("/api/announcements", params={"tag": "ญี่ปุ่น"})).json()
    assert [x["title"] for x in r["items"]] == ["ทุน ญี่ปุ่น"]
    assert r["items"][0]["tags"] == ["ทุนต่างประเทศ", "ญี่ปุ่น"]
    r = (await client.get("/api/announcements", params={"tags": "ญี่ปุ่น,ไม่มีจริง"})).json()
    assert r["total"] == 1


async def test_org_filter_and_orgs_in_meta(session, client) -> None:
    from app.models import Source

    session.add_all(
        [
            Source(id="eng", name="วิศวะ", url="https://eng.cmu.ac.th/", org="มช."),
            Source(id="sci", name="วิทยาศาสตร์", url="https://www.science.cmu.ac.th/", org="มช."),
            Source(
                id="obec", name="สพฐ.", url="https://www.obec.go.th/", pack="teacher", org="สพฐ."
            ),
            Source(id="blog", name="บล็อกครู", url="https://kru.example.com/", pack="teacher"),
        ]
    )
    await session.flush()
    for sid, title in [
        ("eng", "ค่ายวิศวะ"),
        ("sci", "ทุนวิทย์"),
        ("sci", "ทุนวิทย์ 2"),
        ("obec", "อบรมครู"),
        ("blog", "ข่าวครู"),
    ]:
        a = await f.announcement(session, title=title)
        a.source_id = sid
    await session.commit()

    titles = lambda r: {a["title"] for a in r.json()["items"]}  # noqa: E731
    assert titles(await client.get("/api/announcements", params={"org": "มช."})) == {
        "ค่ายวิศวะ",
        "ทุนวิทย์",
        "ทุนวิทย์ 2",
    }
    assert titles(await client.get("/api/announcements", params={"org": "สพฐ."})) == {"อบรมครู"}
    assert (await client.get("/api/announcements", params={"org": "ไม่มี"})).json()["total"] == 0

    meta = (await client.get("/api/meta")).json()
    # Busiest first; the test-src factory source has no org, so it is not listed.
    assert meta["orgs"] == [
        {"id": "มช.", "name": "มช.", "count": 3},
        {"id": "สพฐ.", "name": "สพฐ.", "count": 1},
    ]
    by_id = {s["id"]: s for s in meta["sources"]}
    assert by_id["eng"]["org"] == "มช." and by_id["blog"]["org"] is None
    assert by_id["eng"]["platform"] == "web"


async def test_career_pack_is_accepted(client) -> None:
    assert (await client.get("/api/announcements", params={"pack": "career"})).status_code == 200
    assert (await client.get("/api/announcements", params={"pack": "aliens"})).status_code == 422


async def test_new_link_on_a_known_site_gets_its_org(session) -> None:
    from app.main import _guess_org
    from app.models import Source

    session.add(Source(id="cs", name="CS", url="https://www.cs.science.cmu.ac.th/", org="มช."))
    await session.commit()
    assert await _guess_org(session, "https://eng.cmu.ac.th/") == "มช."
    assert await _guess_org(session, "https://www.chula.ac.th/") is None


async def test_details_are_returned_and_old_posts_have_none(session, client) -> None:
    new = await f.announcement(session, title="งานผู้ช่วยวิจัย", category=Category.JOB)
    new.details = {"position": "ผู้ช่วยวิจัย", "compensation": "15,000 บาท"}
    await f.announcement(session, title="ประกาศเก่า")
    await session.commit()
    items = {a["title"]: a for a in (await client.get("/api/announcements")).json()["items"]}
    assert items["งานผู้ช่วยวิจัย"]["details"] == {
        "position": "ผู้ช่วยวิจัย",
        "compensation": "15,000 บาท",
    }
    assert items["ประกาศเก่า"]["details"] is None
    one = (await client.get(f"/api/announcements/{new.id}")).json()
    assert one["details"]["position"] == "ผู้ช่วยวิจัย"
