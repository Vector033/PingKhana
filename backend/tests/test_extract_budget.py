import asyncio
from datetime import date, timedelta

import httpx
import pytest
from sqlalchemy import select

from app.extract import service
from app.extract.schema import Extracted
from app.extract.service import GeminiBudget, extract_pending, upgrade_rule_results
from app.models import Announcement, Category
from tests import factories as f


class SlowGemini:
    calls = 0

    async def extract(
        self, title: str, body: str, ref: date, poster=None, known_tags=None
    ) -> Extracted:
        self.calls += 1
        await asyncio.sleep(10)
        raise AssertionError("should have timed out")


class FakeGemini:
    """Answers with a fixed deadline, or raises the queued errors first."""

    def __init__(self, errors: list[Exception] | None = None):
        self.calls = 0
        self.errors = list(errors or [])

    async def extract(
        self, title: str, body: str, ref: date, poster=None, known_tags=None
    ) -> Extracted:
        self.calls += 1
        if self.errors:
            raise self.errors.pop(0)
        return Extracted(
            category=Category.SCHOLARSHIP,
            summary_th="จาก Gemini",
            deadline=f.TODAY + timedelta(days=9),
            tags=["ทุนต่างประเทศ"],
            method="gemini:test",
        )


def status_error(code: int) -> httpx.HTTPStatusError:
    req = httpx.Request("POST", "https://gemini.test")
    return httpx.HTTPStatusError(str(code), request=req, response=httpx.Response(code, request=req))


@pytest.fixture
def fake(monkeypatch):
    def install(g: FakeGemini) -> FakeGemini:
        monkeypatch.setattr(service, "_extractor", lambda client: g)
        return g

    return install


async def pending(session, n: int) -> list[Announcement]:
    out = []
    for _ in range(n):
        a = await f.announcement(session)
        a.needs_extraction = True
        out.append(a)
    await session.commit()
    return out


async def methods(session) -> list[str]:
    return list((await session.scalars(select(Announcement.extraction_method))).all())


async def test_budget_caps_gemini_calls_and_rules_cover_the_rest(session, fake) -> None:
    g = fake(FakeGemini())
    await pending(session, 5)
    budget = GeminiBudget(2)
    assert await extract_pending(session, budget) == 5
    assert g.calls == 2
    assert sorted(await methods(session)) == ["gemini:test"] * 2 + ["rules"] * 3


async def test_quota_error_pauses_gemini_for_the_run(session, fake) -> None:
    g = fake(FakeGemini([status_error(429)]))
    await pending(session, 4)
    budget = GeminiBudget(10)
    await extract_pending(session, budget)
    assert g.calls == 1 and budget.tripped
    # Rule results stay "rules", so a later run retries them with Gemini.
    assert await methods(session) == ["rules"] * 4


async def test_bad_request_is_not_retried_in_later_runs(session, fake) -> None:
    fake(FakeGemini([status_error(400)]))
    await pending(session, 1)
    budget = GeminiBudget(5)
    await extract_pending(session, budget)
    assert not budget.tripped
    assert await methods(session) == ["rules:gemini-error"]
    assert await upgrade_rule_results(session, budget, f.TODAY) == 0


async def test_leftover_budget_upgrades_open_rule_results_first(session, fake) -> None:
    g = fake(FakeGemini())
    closed = await f.announcement(session, deadline=f.TODAY - timedelta(days=3))
    open_ = await f.announcement(session, deadline=f.TODAY + timedelta(days=3))
    for a in (closed, open_):
        a.extraction_method = "rules"
    await session.commit()
    assert await upgrade_rule_results(session, GeminiBudget(1), f.TODAY) == 1
    assert g.calls == 1
    await session.refresh(open_)
    await session.refresh(closed)
    assert open_.extraction_method == "gemini:test"
    assert closed.extraction_method == "rules"


async def test_spacing_between_calls(monkeypatch) -> None:
    waits: list[float] = []

    async def fake_sleep(s: float) -> None:
        waits.append(s)

    monkeypatch.setattr(service.asyncio, "sleep", fake_sleep)
    b = GeminiBudget(3, min_interval=6.0)
    assert [await b.take() for _ in range(4)] == [True, True, True, False]
    assert len(waits) == 2 and all(5 < w <= 6 for w in waits)


async def test_time_cap_stops_new_calls(monkeypatch) -> None:
    b = GeminiBudget(10, max_seconds=240)
    assert b.available
    later = service.time.monotonic() + 241
    monkeypatch.setattr(service.time, "monotonic", lambda: later)
    assert not b.available
    assert not await b.take()


async def test_slow_answer_times_out_and_pauses_gemini(session, fake, monkeypatch) -> None:
    monkeypatch.setattr(service, "CALL_TIMEOUT", 0.05)
    g = fake(SlowGemini())
    await pending(session, 3)
    budget = GeminiBudget(10)
    await extract_pending(session, budget)
    assert g.calls == 1 and budget.tripped
    assert await methods(session) == ["rules"] * 3


async def test_poster_pass_rereads_gemini_results_without_deadline(
    session, fake, monkeypatch
) -> None:
    g = fake(FakeGemini())
    seen = []

    async def poster(url):
        seen.append(url)
        return (b"img", "image/png")

    monkeypatch.setattr(service, "fetch_poster", poster)
    no_date = await f.announcement(session, title="อบรมครู")
    no_date.extraction_method, no_date.image_url = "gemini:x", "https://example.com/p.png"
    done = await f.announcement(session, title="อ่านรูปแล้ว")
    done.extraction_method, done.image_url = "gemini:x+poster", "https://example.com/q.png"
    news = await f.announcement(session, title="ข่าว", category=Category.GENERAL)
    news.extraction_method, news.image_url = "gemini:x", "https://example.com/r.png"
    await session.commit()

    assert await service.read_posters(session, GeminiBudget(5), f.TODAY) == 1
    assert g.calls == 1 and seen == ["https://example.com/p.png"]
    await session.refresh(no_date)
    assert no_date.deadline == f.TODAY + timedelta(days=9)


async def test_tag_backfill_tags_recent_gemini_results_once(session, fake) -> None:
    g = fake(FakeGemini())
    old = await f.announcement(session, title="ไม่มีแท็ก")
    old.extraction_method = "gemini:x"
    ruled = await f.announcement(session, title="ใช้กฎ")
    ruled.extraction_method = "rules"
    await session.commit()
    assert await service.tag_recent(session, GeminiBudget(5), f.TODAY) == 1
    assert g.calls == 1
    await session.refresh(old)
    assert old.tags == ["ทุนต่างประเทศ"]
    assert await service.tag_recent(session, GeminiBudget(5), f.TODAY) == 0


def test_clean_tags() -> None:
    from app.extract.gemini import clean_tags

    assert clean_tags(["#ทุน ", "ทุน", "Python", "x", "a" * 40, "สอบครูผู้ช่วย", "อบรม", "อื่น"]) == [
        "ทุน",
        "python",
        "สอบครูผู้ช่วย",
        "อบรม",
    ]
    assert clean_tags([]) is None
