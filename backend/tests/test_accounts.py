import httpx
import pytest
from sqlalchemy import select

from app import accounts
from app.line.client import LineClient
from app.line.handlers import handle_event
from app.main import app
from app.models import Account
from tests import factories as f
from tests.test_line import all_text, ev


@pytest.fixture
async def client(monkeypatch):
    s = accounts.get_settings()
    monkeypatch.setattr(s, "google_client_id", "cid")
    monkeypatch.setattr(s, "session_secret", "secret")

    async def fake_verify(credential, client_id):
        assert client_id == "cid"
        return {"sub": "g-123", "email": "teacher@example.com", "name": "ครูสมใจ"}

    monkeypatch.setattr(accounts, "verify_google", fake_verify)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c


def test_session_token_signed_and_expiring() -> None:
    t = accounts.make_session(7, "k", now=1000)
    assert accounts.read_session(t, "k", now=1001) == 7
    assert accounts.read_session(t, "other", now=1001) is None
    assert accounts.read_session(t + "x", "k", now=1001) is None
    assert accounts.read_session(t, "k", now=1000 + 31 * 86400) is None


async def test_sign_in_follow_and_link_line(session, client) -> None:
    r = await client.post("/api/auth/google", json={"credential": "x" * 40})
    assert r.status_code == 200
    token = r.json()["token"]
    auth = {"Authorization": f"Bearer {token}"}
    assert (await client.get("/api/me")).status_code == 401

    r = await client.put(
        "/api/me/follow", json={"sources": ["obec", "obec"], "tags": ["สอบครูผู้ช่วย"]}, headers=auth
    )
    assert r.json()["sources"] == ["obec"] and r.json()["tags"] == ["สอบครูผู้ช่วย"]

    code = (await client.post("/api/me/line-code", headers=auth)).json()["code"]
    line = LineClient()
    await handle_event(session, line, ev(text="ผูก 000000", uid="U-teacher"), f.NOW)
    assert "ไม่ถูกต้อง" in all_text(line.outbox[-1].messages)
    await handle_event(session, line, ev(text=f"ผูก {code}", uid="U-teacher"), f.NOW)
    assert "ผูกบัญชี" in all_text(line.outbox[-1].messages)
    assert (await client.get("/api/me", headers=auth)).json()["line_linked"] is True
    from app.models import Source, User

    session.add(Source(id="obec", name="สพฐ.", url="https://www.obec.go.th/", pack="teacher"))
    await session.commit()
    await client.put("/api/me/follow", json={"sources": ["obec"], "tags": []}, headers=auth)
    session.expire_all()
    u = await session.scalar(select(User).where(User.line_user_id == "U-teacher"))
    assert u.packs == ["teacher"]

    assert (await client.delete("/api/me", headers=auth)).status_code == 204
    assert await session.scalar(select(Account)) is None


async def test_sign_in_off_without_settings(monkeypatch) -> None:
    monkeypatch.setattr(accounts.get_settings(), "google_client_id", "")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/auth/google", json={"credential": "x" * 40})
    assert r.status_code == 503
