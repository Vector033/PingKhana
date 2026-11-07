from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BANGKOK = ZoneInfo("Asia/Bangkok")


def asyncpg_url(url: str) -> str:
    """Accept the plain connection strings hosts hand out (Neon, Render, Supabase).

    asyncpg wants the `postgresql+asyncpg` scheme and `ssl=` instead of libpq's `sslmode=`,
    and it rejects libpq-only options such as `channel_binding`.
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"
    query = []
    for key, value in parse_qsl(parts.query):
        if key == "sslmode":
            query.append(("ssl", value))
        elif key != "channel_binding":
            query.append((key, value))
    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://pingkhana:pingkhana@localhost:54532/pingkhana"

    # LINE Messaging API. Empty values put the bot in "dry run": messages are logged, not sent.
    line_channel_secret: str = ""
    line_channel_access_token: str = ""
    line_login_channel_id: str = ""  # LIFF lives on a LINE Login channel; used to verify ID tokens
    liff_id: str = ""

    # Free LINE OA plan in Thailand: 300 push messages/month (lineforbusiness.com, checked 2026-11-04).
    # Reply messages are free. We keep a safety margin under the plan limit.
    push_monthly_limit: int = 300
    push_safety_margin: int = 20
    # Share of the monthly budget kept for deadline reminders before any digest is pushed.
    reminder_reserve_ratio: float = 0.5

    gemini_api_key: str = ""
    # gemini-flash-latest hung for >90 s on 2026-11-08 while these two answered in 1-2 s.
    gemini_model: str = "gemini-3.6-flash"
    # Comma-separated; used when the main model answers 503 "high demand" or has been retired.
    gemini_fallback_models: str = "gemini-flash-lite-latest,gemini-flash-latest"
    # Free tier is ~10 requests/minute and a few hundred a day. One collection run (hourly) spends
    # at most this many calls, 6 s apart; the rest get rule-based results that later runs upgrade.
    gemini_max_calls_per_run: int = 15
    gemini_min_interval_seconds: float = 6.0
    # Stop starting new Gemini calls after this long, so /jobs/run ends well inside 10 minutes.
    gemini_max_seconds_per_run: float = 240.0

    user_agent: str = "PingKhanaBot/0.1 (+https://github.com/Vector033/PingKhana)"
    # Never fetch the same source more often than this, whatever the scheduler does.
    min_fetch_interval_minutes: int = 60

    public_web_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    # Token required by the /jobs/* endpoints that the scheduler calls.
    jobs_token: str = ""

    @field_validator("database_url")
    @classmethod
    def _asyncpg_url(cls, v: str) -> str:
        return asyncpg_url(v)

    @property
    def gemini_fallbacks(self) -> tuple[str, ...]:
        return tuple(m.strip() for m in self.gemini_fallback_models.split(",") if m.strip())

    @property
    def line_dry_run(self) -> bool:
        return not self.line_channel_access_token


@lru_cache
def get_settings() -> Settings:
    return Settings()
