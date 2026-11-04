"""Thin LINE Messaging API client. Without an access token it runs dry: calls are recorded only."""

import base64
import hashlib
import hmac
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

log = logging.getLogger(__name__)

API = "https://api.line.me"


def verify_signature(channel_secret: str, body: bytes, signature: str) -> bool:
    digest = hmac.new(channel_secret.encode(), body, hashlib.sha256).digest()
    return hmac.compare_digest(base64.b64encode(digest).decode(), signature)


class LineApiError(Exception):
    def __init__(self, status: int, body: str):
        super().__init__(f"LINE API {status}: {body[:300]}")
        self.status = status


@dataclass
class SentRecord:
    kind: str  # reply | push
    to: str
    messages: list[dict[str, Any]]


@dataclass
class LineClient:
    access_token: str = ""
    http: httpx.AsyncClient | None = None
    outbox: list[SentRecord] = field(default_factory=list)  # dry-run log

    @property
    def dry_run(self) -> bool:
        return not self.access_token

    async def _post(self, path: str, payload: dict, retry_key: str | None = None) -> None:
        headers = {"Authorization": f"Bearer {self.access_token}"}
        if retry_key:
            # LINE drops a second request with the same key: a retried push is never sent twice.
            headers["X-Line-Retry-Key"] = retry_key
        http = self.http or httpx.AsyncClient(timeout=20)
        try:
            resp = await http.post(f"{API}{path}", json=payload, headers=headers)
        finally:
            if self.http is None:
                await http.aclose()
        if resp.status_code == 409 and retry_key:
            return  # already accepted earlier with this retry key
        if resp.status_code >= 400:
            raise LineApiError(resp.status_code, resp.text)

    async def reply(self, reply_token: str, messages: list[dict]) -> None:
        if self.dry_run:
            self.outbox.append(SentRecord("reply", reply_token, messages))
            log.info("[dry-run] reply %s", messages)
            return
        await self._post(
            "/v2/bot/message/reply", {"replyToken": reply_token, "messages": messages[:5]}
        )

    async def push(self, user_id: str, messages: list[dict], retry_key: str) -> None:
        if self.dry_run:
            self.outbox.append(SentRecord("push", user_id, messages))
            log.info("[dry-run] push to %s %s", user_id, messages)
            return
        await self._post(
            "/v2/bot/message/push", {"to": user_id, "messages": messages[:5]}, retry_key
        )

    async def _get(self, path: str) -> dict:
        async with httpx.AsyncClient(timeout=20) as http:
            resp = await http.get(
                f"{API}{path}", headers={"Authorization": f"Bearer {self.access_token}"}
            )
        if resp.status_code >= 400:
            raise LineApiError(resp.status_code, resp.text)
        return resp.json()

    async def quota(self) -> int | None:
        """Monthly message limit of the plan (None = unlimited / unknown)."""
        if self.dry_run:
            return None
        data = await self._get("/v2/bot/message/quota")
        return data.get("value") if data.get("type") == "limited" else None

    async def consumption(self) -> int | None:
        if self.dry_run:
            return None
        return (await self._get("/v2/bot/message/quota/consumption")).get("totalUsage")

    async def followers(self) -> int | None:
        """Friend count from LINE insight (yesterday's numbers; None in dry run)."""
        if self.dry_run:
            return None
        from datetime import date, timedelta

        day = (date.today() - timedelta(days=1)).strftime("%Y%m%d")
        data = await self._get(f"/v2/bot/insight/followers?date={day}")
        return data.get("followers") if data.get("status") == "ready" else None


async def verify_liff_id_token(id_token: str, channel_id: str) -> str:
    """Return the LINE userId (sub) for a LIFF ID token, verified by LINE."""
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.post(
            f"{API}/oauth2/v2.1/verify", data={"id_token": id_token, "client_id": channel_id}
        )
    if resp.status_code != 200:
        raise LineApiError(resp.status_code, resp.text)
    return resp.json()["sub"]


_client: LineClient | None = None


def get_line_client() -> LineClient:
    global _client
    if _client is None:
        from app.config import get_settings

        _client = LineClient(get_settings().line_channel_access_token)
    return _client
