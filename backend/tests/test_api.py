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
    await f.announcement(session, title="สหกิจ", category=Category.INTERNSHIP)
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
    assert {"id": "teacher", "th": "ครู / ศึกษาธิการ"} in meta["packs"]
