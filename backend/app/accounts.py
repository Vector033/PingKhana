"""Optional website accounts (Google sign-in). Everything still works without one.

An account keeps what someone follows on the website (sources and tags) so it follows them to
other devices, and can be linked to their LINE chat with a short code typed in the bot.

Sign-in: the page gets a Google ID token from Google Identity Services and sends it here; it is
checked with Google (tokeninfo: signature, expiry, our client id) and exchanged for our own
session token, an HMAC-signed payload. Nothing works unless GOOGLE_CLIENT_ID and SESSION_SECRET
are set, and the website hides the button until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime, timedelta
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import BANGKOK, get_settings
from app.db import get_session
from app.models import Account, Source, User

router = APIRouter()
Session = Annotated[AsyncSession, Depends(get_session)]
SESSION_DAYS = 30
LINK_MINUTES = 10


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_session(account_id: int, secret: str, now: float | None = None) -> str:
    body = {"a": account_id, "exp": int((now or time.time()) + SESSION_DAYS * 86400)}
    payload = _b64(json.dumps(body).encode())
    sig = _b64(hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def read_session(token: str, secret: str, now: float | None = None) -> int | None:
    try:
        payload, sig = token.split(".")
        good = _b64(hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        body = json.loads(_unb64(payload))
        if body["exp"] < (now or time.time()):
            return None
        return int(body["a"])
    except (ValueError, KeyError, json.JSONDecodeError):
        return None


def _enabled() -> tuple[str, str]:
    s = get_settings()
    if not (s.google_client_id and s.session_secret):
        raise HTTPException(503, "sign-in is not set up")
    return s.google_client_id, s.session_secret


async def verify_google(credential: str, client_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            "https://oauth2.googleapis.com/tokeninfo", params={"id_token": credential}
        )
    if r.status_code != 200:
        raise HTTPException(401, "Google sign-in failed")
    info = r.json()
    if info.get("aud") != client_id or info.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        raise HTTPException(401, "token is not for this site")
    return info


async def verify_google_access_token(token: str, client_id: str) -> dict:
    """Check the token was issued to our client (tokeninfo), then read the profile."""
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            "https://oauth2.googleapis.com/tokeninfo", params={"access_token": token}
        )
        if r.status_code != 200:
            raise HTTPException(401, "Google sign-in failed")
        info = r.json()
        if client_id not in (info.get("aud"), info.get("azp")) or not info.get("sub"):
            raise HTTPException(401, "token is not for this site")
        u = await http.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {token}"},
        )
    profile = u.json() if u.status_code == 200 else {}
    return {
        "sub": info["sub"],
        "email": profile.get("email") or info.get("email", ""),
        "name": profile.get("name"),
    }


async def current_account(
    session: Session, authorization: Annotated[str | None, Header()] = None
) -> Account:
    _, secret = _enabled()
    token = (authorization or "").removeprefix("Bearer ").strip()
    account_id = read_session(token, secret) if token else None
    account = await session.get(Account, account_id) if account_id else None
    if account is None:
        raise HTTPException(401, "sign in again")
    return account


Me = Annotated[Account, Depends(current_account)]


class AccountOut(BaseModel):
    email: str
    name: str | None
    sources: list[str]
    tags: list[str]
    line_linked: bool


def _out(a: Account) -> AccountOut:
    return AccountOut(
        email=a.email,
        name=a.name,
        sources=a.sources or [],
        tags=a.tags or [],
        line_linked=a.line_user_id is not None,
    )


class GoogleIn(BaseModel):
    # Either an ID token (Google's button) or an access token (our own button + Google's popup).
    credential: str | None = Field(None, min_length=20, max_length=4096)
    access_token: str | None = Field(None, min_length=20, max_length=4096)


@router.post("/api/auth/google")
async def sign_in(body: GoogleIn, session: Session) -> dict:
    client_id, secret = _enabled()
    if body.access_token:
        info = await verify_google_access_token(body.access_token, client_id)
    elif body.credential:
        info = await verify_google(body.credential, client_id)
    else:
        raise HTTPException(422, "credential or access_token")
    account = await session.scalar(select(Account).where(Account.google_sub == info["sub"]))
    if account is None:
        account = Account(google_sub=info["sub"], email=info.get("email", ""))
        session.add(account)
    account.email = info.get("email", account.email)
    account.name = info.get("name")
    await session.commit()
    return {"token": make_session(account.id, secret), "account": _out(account)}


@router.get("/api/me", response_model=AccountOut)
async def me(account: Me) -> AccountOut:
    return _out(account)


class FollowIn(BaseModel):
    sources: list[str] = Field(default_factory=list, max_length=100)
    tags: list[str] = Field(default_factory=list, max_length=30)


async def sync_line_packs(session: AsyncSession, account: Account) -> None:
    """A linked LINE chat follows the packs of the sources followed on the website."""
    if not account.line_user_id or not account.sources:
        return
    packs = list(
        dict.fromkeys(
            (await session.scalars(select(Source.pack).where(Source.id.in_(account.sources)))).all()
        )
    )
    user = await session.scalar(select(User).where(User.line_user_id == account.line_user_id))
    if user is not None and packs:
        user.packs = packs


@router.put("/api/me/follow", response_model=AccountOut)
async def save_follow(body: FollowIn, account: Me, session: Session) -> AccountOut:
    account.sources = [s[:64] for s in dict.fromkeys(body.sources)]
    account.tags = [t[:32] for t in dict.fromkeys(body.tags)]
    await sync_line_packs(session, account)
    await session.commit()
    return _out(account)


@router.post("/api/me/line-code")
async def line_code(account: Me, session: Session) -> dict:
    """A 6-digit code to type in the LINE chat ("ผูก 123456") to link this account."""
    account.link_code = f"{secrets.randbelow(1_000_000):06d}"
    account.link_code_expires = datetime.now(tz=BANGKOK) + timedelta(minutes=LINK_MINUTES)
    await session.commit()
    return {"code": account.link_code, "minutes": LINK_MINUTES}


@router.delete("/api/me", status_code=204)
async def delete_me(account: Me, session: Session) -> None:
    await session.delete(account)
    await session.commit()


async def link_line_user(session: AsyncSession, user: User, code: str, now: datetime) -> bool:
    """Called by the bot for "ผูก <code>": attach this LINE user to the waiting account."""
    account = await session.scalar(select(Account).where(Account.link_code == code))
    if account is None or account.link_code_expires is None or account.link_code_expires < now:
        return False
    account.line_user_id = user.line_user_id
    account.link_code = None
    account.link_code_expires = None
    await sync_line_packs(session, account)
    await session.commit()
    return True
