import asyncio
import json
import logging
from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import any_, delete, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import jobs
from app.catalog import MAJORS, YEARS
from app.collector.pipeline import BROKEN_AFTER
from app.config import BANGKOK, get_settings
from app.db import SessionLocal, get_session
from app.line.client import LineApiError, get_line_client, verify_liff_id_token, verify_signature
from app.line.handlers import get_or_create_user, handle_event
from app.models import CATEGORY_TH, Announcement, Category, Delivery, Reminder, Source, User
from app.queries import still_open, visible

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("pingkhana")

app = FastAPI(title="PingKhana API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "PUT", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

Session = Annotated[AsyncSession, Depends(get_session)]


def now_bkk() -> datetime:
    return datetime.now(tz=BANGKOK)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


# ---------- LINE webhook ----------


@app.post("/webhook")
async def webhook(request: Request, background: BackgroundTasks) -> dict:
    s = get_settings()
    body = await request.body()
    signature = request.headers.get("x-line-signature", "")
    if s.line_channel_secret:
        if not verify_signature(s.line_channel_secret, body, signature):
            raise HTTPException(401, "bad signature")
    elif not s.line_dry_run:
        raise HTTPException(500, "LINE_CHANNEL_SECRET is not set")
    events = json.loads(body or b"{}").get("events", [])
    # LINE expects a fast 200; webhook redeliveries carry the same webhookEventId.
    background.add_task(_process_events, events)
    return {"ok": True}


_seen_event_ids: dict[str, None] = {}


async def _process_events(events: list[dict]) -> None:
    line = get_line_client()
    for ev in events:
        eid = ev.get("webhookEventId")
        if eid:
            if eid in _seen_event_ids:
                continue
            _seen_event_ids[eid] = None
            if len(_seen_event_ids) > 5000:
                _seen_event_ids.pop(next(iter(_seen_event_ids)))
        async with SessionLocal() as session:
            try:
                await handle_event(session, line, ev, now_bkk())
            except Exception:
                log.exception("failed to handle event %s", ev.get("type"))
                await session.rollback()


# ---------- Public API (website) ----------


class AnnouncementOut(BaseModel):
    id: int
    source_id: str
    source_name: str
    url: str
    title: str
    category: str
    category_th: str
    summary_th: str | None
    deadline: date | None
    deadline_text: str | None
    eligible_years: list[int] | None
    eligible_majors: list[str] | None
    min_gpax: float | None
    published_on: date | None
    first_seen_at: datetime


def to_out(a: Announcement, source_names: dict[str, str]) -> AnnouncementOut:
    return AnnouncementOut(
        id=a.id,
        source_id=a.source_id,
        source_name=source_names.get(a.source_id, a.source_id),
        url=a.url,
        title=a.title,
        category=a.category,
        category_th=CATEGORY_TH[Category(a.category)],
        summary_th=a.summary_th,
        deadline=a.deadline,
        deadline_text=a.deadline_text,
        eligible_years=a.eligible_years,
        eligible_majors=a.eligible_majors,
        min_gpax=float(a.min_gpax) if a.min_gpax is not None else None,
        published_on=a.published_on,
        first_seen_at=a.first_seen_at,
    )


async def _source_names(session: AsyncSession) -> dict[str, str]:
    return dict((await session.execute(select(Source.id, Source.name))).all())


class Page(BaseModel):
    items: list[AnnouncementOut]
    total: int
    page: int
    page_size: int


@app.get("/api/announcements", response_model=Page)
async def list_announcements(
    session: Session,
    q: str | None = None,
    category: Category | None = None,
    source: str | None = None,
    status: str = Query("all", pattern="^(all|open|closing)$"),
    year: int | None = Query(None, ge=1, le=6),
    major: str | None = None,
    sort: str = Query("new", pattern="^(new|deadline)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> Page:
    today = now_bkk().date()
    query = visible()
    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                Announcement.title.ilike(like),
                Announcement.summary_th.ilike(like),
                Announcement.body_text.ilike(like),
            )
        )
    if category:
        query = query.where(Announcement.category == category.value)
    if source:
        query = query.where(Announcement.source_id == source)
    if status == "open":
        query = query.where(still_open(today))
    elif status == "closing":
        query = query.where(
            Announcement.deadline >= today, Announcement.deadline <= today + timedelta(days=14)
        )
    if year:
        query = query.where(
            or_(
                Announcement.eligible_years.is_(None),
                literal(year) == any_(Announcement.eligible_years),
            )
        )
    if major:
        query = query.where(
            or_(
                Announcement.eligible_majors.is_(None),
                literal(major) == any_(Announcement.eligible_majors),
            )
        )
    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0
    if sort == "deadline":
        query = query.order_by(Announcement.deadline.asc().nulls_last(), Announcement.id.desc())
    else:
        # Posts without a publish date (some sites show none) go after dated ones.
        query = query.order_by(
            Announcement.published_on.desc().nulls_last(),
            Announcement.first_seen_at.desc(),
            Announcement.id.desc(),
        )
    rows = (await session.scalars(query.offset((page - 1) * page_size).limit(page_size))).all()
    names = await _source_names(session)
    return Page(items=[to_out(a, names) for a in rows], total=total, page=page, page_size=page_size)


@app.get("/api/announcements/{ann_id}", response_model=AnnouncementOut)
async def get_announcement(ann_id: int, session: Session) -> AnnouncementOut:
    a = await session.get(Announcement, ann_id)
    if a is None or a.duplicate_of_id is not None:
        raise HTTPException(404)
    return to_out(a, await _source_names(session))


@app.get("/api/meta")
async def meta(session: Session) -> dict:
    sources = (
        await session.scalars(select(Source).where(Source.enabled).order_by(Source.name))
    ).all()
    return {
        "categories": [{"id": c.value, "th": CATEGORY_TH[c]} for c in Category],
        "majors": [{"id": k, "th": v["th"]} for k, v in MAJORS.items()],
        "years": YEARS,
        "sources": [{"id": s.id, "name": s.name, "url": s.url} for s in sources],
        "liff_id": get_settings().liff_id,
    }


async def _extraction_counts(session: AsyncSession) -> dict[str, int]:
    q = visible().subquery()
    rows = (
        await session.execute(
            select(q.c.extraction_method, func.count()).group_by(q.c.extraction_method)
        )
    ).all()
    out: dict[str, int] = {}
    for method, n in rows:
        key = "gemini" if (method or "").startswith("gemini:") else (method or "unknown")
        out[key] = out.get(key, 0) + n
    return out


@app.get("/api/stats")
async def stats(session: Session) -> dict:
    sources = (await session.scalars(select(Source).order_by(Source.name))).all()
    follower_count = None
    try:
        follower_count = await get_line_client().followers()
    except LineApiError:
        pass
    return {
        "announcements": await session.scalar(
            select(func.count()).select_from(visible().subquery())
        ),
        "open_with_deadline": await session.scalar(
            select(func.count())
            .select_from(Announcement)
            .where(
                Announcement.deadline >= now_bkk().date(), Announcement.duplicate_of_id.is_(None)
            )
        ),
        "users": await session.scalar(select(func.count()).select_from(User)),
        "followers": follower_count,
        "reminders_set": await session.scalar(select(func.count()).select_from(Reminder)),
        "reminders_sent": await session.scalar(
            select(func.count())
            .select_from(Delivery)
            .where(Delivery.kind.like("reminder%"), Delivery.status == "sent")
        ),
        # How each visible announcement was read: "gemini" (any Gemini model), "rules",
        # "rules:gemini-error". Shows the hourly runs replacing rule results with Gemini.
        "extraction": await _extraction_counts(session),
        "sources": [
            {
                "id": s.id,
                "name": s.name,
                "url": s.url,
                "last_success_at": s.last_success_at,
                "healthy": s.consecutive_failures < BROKEN_AFTER,
                "last_error": s.last_error if s.consecutive_failures else None,
            }
            for s in sources
        ],
    }


# ---------- LIFF (settings page inside LINE) ----------


async def liff_user_id(authorization: Annotated[str | None, Header()] = None) -> str:
    s = get_settings()
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing LIFF ID token")
    token = authorization.removeprefix("Bearer ").strip()
    if not s.line_login_channel_id:
        # Local development without LINE: "Bearer dev:<userId>" stands in for a real token.
        if s.line_dry_run and token.startswith("dev:"):
            return token.removeprefix("dev:")
        raise HTTPException(503, "LIFF is not configured")
    try:
        return await verify_liff_id_token(token, s.line_login_channel_id)
    except LineApiError as e:
        raise HTTPException(401, "invalid LIFF ID token") from e


LiffUser = Annotated[str, Depends(liff_user_id)]


class Prefs(BaseModel):
    year: int | None = Field(None, ge=1, le=6)
    major: str | None = None
    categories: list[Category] = Field(default_factory=list)
    notify_new: bool = True


class PrefsOut(Prefs):
    reminders: list[AnnouncementOut] = []


@app.get("/api/liff/me", response_model=PrefsOut)
async def get_me(line_user_id: LiffUser, session: Session) -> PrefsOut:
    user = await session.scalar(select(User).where(User.line_user_id == line_user_id))
    if user is None:
        return PrefsOut(categories=[c for c in Category if c != Category.GENERAL])
    anns = (
        await session.scalars(
            select(Announcement)
            .join(Reminder, Reminder.announcement_id == Announcement.id)
            .where(Reminder.user_id == user.id)
            .order_by(Announcement.deadline)
        )
    ).all()
    names = await _source_names(session)
    return PrefsOut(
        year=user.year,
        major=user.major,
        categories=[Category(c) for c in user.categories],
        notify_new=user.notify_new,
        reminders=[to_out(a, names) for a in anns],
    )


@app.put("/api/liff/me", response_model=Prefs)
async def put_me(prefs: Prefs, line_user_id: LiffUser, session: Session) -> Prefs:
    if prefs.major is not None and prefs.major not in MAJORS:
        raise HTTPException(422, "unknown major")
    user = await get_or_create_user(session, line_user_id)
    user.year, user.major = prefs.year, prefs.major
    user.categories = [c.value for c in prefs.categories]
    user.notify_new = prefs.notify_new
    await session.commit()
    return prefs


@app.delete("/api/liff/me", status_code=204)
async def delete_me(line_user_id: LiffUser, session: Session) -> None:
    await session.execute(delete(User).where(User.line_user_id == line_user_id))
    await session.commit()


@app.post("/api/liff/reminders/{ann_id}", status_code=204)
async def add_reminder(ann_id: int, line_user_id: LiffUser, session: Session) -> None:
    ann = await session.get(Announcement, ann_id)
    if ann is None or ann.deadline is None or ann.deadline < now_bkk().date():
        raise HTTPException(409, "announcement has no open deadline")
    user = await get_or_create_user(session, line_user_id)
    exists = await session.scalar(
        select(Reminder.id).where(Reminder.user_id == user.id, Reminder.announcement_id == ann_id)
    )
    if exists is None:
        session.add(Reminder(user_id=user.id, announcement_id=ann_id))
    await session.commit()


@app.delete("/api/liff/reminders/{ann_id}", status_code=204)
async def remove_reminder(ann_id: int, line_user_id: LiffUser, session: Session) -> None:
    user = await session.scalar(select(User).where(User.line_user_id == line_user_id))
    if user:
        await session.execute(
            delete(Reminder).where(Reminder.user_id == user.id, Reminder.announcement_id == ann_id)
        )
        await session.commit()


# ---------- Scheduler entry points ----------


def check_jobs_token(authorization: Annotated[str | None, Header()] = None) -> None:
    token = get_settings().jobs_token
    if not token or authorization != f"Bearer {token}":
        raise HTTPException(401)


# One run at a time: GitHub Actions and cron-job.org may both call in the same hour.
_job_lock = asyncio.Lock()
_last_run: dict = {}


async def _run_locked() -> dict:
    async with _job_lock:
        started = datetime.now(tz=BANGKOK)
        try:
            result = await jobs.run_all()
        except Exception as e:
            log.exception("scheduled run failed")
            _last_run.update(started=started.isoformat(), ok=False, error=repr(e)[:200])
            raise
        _last_run.update(started=started.isoformat(), ok=True, result=result, error=None)
        return result


@app.post("/jobs/run", dependencies=[Depends(check_jobs_token)])
async def run_jobs(tasks: BackgroundTasks, background: Annotated[bool, Query()] = False) -> dict:
    """Collect, extract and notify.

    `?background=1` answers right away and runs after the response, for schedulers with a short
    HTTP timeout (cron-job.org allows 30 s). Without it the caller waits for the result.
    """
    if _job_lock.locked():
        return {"status": "already running", "last_run": _last_run}
    if background:
        tasks.add_task(_run_locked)
        return {"status": "started", "last_run": _last_run}
    return await _run_locked()


@app.get("/jobs/last", dependencies=[Depends(check_jobs_token)])
async def last_job() -> dict:
    return _last_run
