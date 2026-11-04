import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://pingkhana:pingkhana@localhost:54532/pingkhana_test"
)
# Tests never talk to real LINE or Gemini.
os.environ["LINE_CHANNEL_ACCESS_TOKEN"] = ""
os.environ["LINE_CHANNEL_SECRET"] = "test-secret"
os.environ["GEMINI_API_KEY"] = ""
os.environ["LINE_LOGIN_CHANNEL_ID"] = ""
os.environ["JOBS_TOKEN"] = "test-jobs-token"

from collections.abc import AsyncIterator  # noqa: E402

import pytest  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from app import models  # noqa: E402,F401
from app.db import Base, SessionLocal, engine  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
async def _schema() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
async def _clean() -> AsyncIterator[None]:
    yield
    names = ", ".join(t.name for t in Base.metadata.sorted_tables)
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))


@pytest.fixture
async def session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as s:
        yield s
