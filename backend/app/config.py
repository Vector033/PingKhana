from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict

BANGKOK = ZoneInfo("Asia/Bangkok")


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
    gemini_model: str = "gemini-flash-latest"

    user_agent: str = "PingKhanaBot/0.1 (+https://github.com/Vector033/PingKhana)"
    # Never fetch the same source more often than this, whatever the scheduler does.
    min_fetch_interval_minutes: int = 60

    public_web_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    # Token required by the /jobs/* endpoints that the scheduler calls.
    jobs_token: str = ""

    @property
    def line_dry_run(self) -> bool:
        return not self.line_channel_access_token


@lru_cache
def get_settings() -> Settings:
    return Settings()
