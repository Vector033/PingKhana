import asyncio
import json
import logging
from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import String, any_, delete, func, literal, or_, select
from sqlalchemy.dialects.postgresql import array as pg_array
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

from app.accounts import router as accounts_router  # noqa: E402

app.include_router(accounts_router)


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
    image_url: str | None = None
    tags: list[str] | None = None
    # Other sites that posted the same announcement (detail endpoint only).
    also_on: list[dict] | None = None


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
        image_url=a.image_url,
        tags=a.tags or None,
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
    # open = things to apply for (every category except general news); news = general only.
    kind: str = Query("all", pattern="^(all|open|news)$"),
    pack: str | None = Query(None, pattern="^(student|teacher|general)$"),
    # Comma-separated source ids: what a visitor follows on the website.
    sources: str | None = Query(None, max_length=1000),
    tag: str | None = Query(None, max_length=48),
    # Comma-separated: posts with any of these tags (the tags a visitor follows).
    tags: str | None = Query(None, max_length=1000),
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
    if kind == "open":
        query = query.where(Announcement.category != Category.GENERAL.value)
    elif kind == "news":
        query = query.where(Announcement.category == Category.GENERAL.value)
    if tag:
        query = query.where(literal(tag) == any_(Announcement.tags))
    if tags:
        wanted = [t.strip() for t in tags.split(",") if t.strip()][:30]
        query = query.where(Announcement.tags.op("&&")(pg_array(wanted, type_=String)))
    if sources:
        ids = [s.strip() for s in sources.split(",") if s.strip()][:100]
        query = query.where(Announcement.source_id.in_(ids))
    if pack:
        query = query.where(
            Announcement.source_id.in_(select(Source.id).where(Source.pack == pack))
        )
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
    if a is not None and a.duplicate_of_id is not None:
        # An old link to a repost shows the announcement it was merged into.
        a = await session.get(Announcement, a.duplicate_of_id)
    if a is None:
        raise HTTPException(404)
    names = await _source_names(session)
    out = to_out(a, names)
    copies = (
        await session.scalars(select(Announcement).where(Announcement.duplicate_of_id == a.id))
    ).all()
    out.also_on = [
        {"source_name": names.get(c.source_id, c.source_id), "url": c.url}
        for c in copies
        if c.source_id != a.source_id
    ] or None
    return out


PACKS = {"student": "นักศึกษา มช.", "teacher": "ครู / ศึกษาธิการ", "general": "ทั่วไป"}


@app.get("/api/meta")
async def meta(session: Session) -> dict:
    sources = (
        await session.scalars(select(Source).where(Source.enabled).order_by(Source.name))
    ).all()
    return {
        "categories": [{"id": c.value, "th": CATEGORY_TH[c]} for c in Category],
        "majors": [{"id": k, "th": v["th"]} for k, v in MAJORS.items()],
        "years": YEARS,
        "sources": [{"id": s.id, "name": s.name, "url": s.url, "pack": s.pack} for s in sources],
        "packs": [
            {"id": p, "th": th} for p, th in PACKS.items() if any(s.pack == p for s in sources)
        ],
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
    sources = (
        await session.scalars(select(Source).where(Source.enabled).order_by(Source.name))
    ).all()
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
                "pack": PACKS.get(s.pack, s.pack),
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
    packs: list[str] = Field(default_factory=lambda: ["student"])


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
        packs=user.packs or ["student"],
        reminders=[to_out(a, names) for a in anns],
    )


@app.put("/api/liff/me", response_model=Prefs)
async def put_me(prefs: Prefs, line_user_id: LiffUser, session: Session) -> Prefs:
    if prefs.major is not None and prefs.major not in MAJORS:
        raise HTTPException(422, "unknown major")
    if not prefs.packs or any(p not in PACKS for p in prefs.packs):
        raise HTTPException(422, "unknown pack")
    user = await get_or_create_user(session, line_user_id)
    user.year, user.major = prefs.year, prefs.major
    user.categories = [c.value for c in prefs.categories]
    user.notify_new = prefs.notify_new
    user.packs = list(dict.fromkeys(prefs.packs))
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


# ---------- Sources people add on the website ----------

_discover_hits: dict[str, list[float]] = {}
DISCOVER_PER_HOUR = 10


def _rate_limit(request: Request) -> None:
    """A few discoveries per visitor per hour: each one fetches a site and may call Gemini."""
    import time

    ip = (
        (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?"))
        .split(",")[0]
        .strip()
    )
    now = time.monotonic()
    hits = [t for t in _discover_hits.get(ip, []) if now - t < 3600]
    if len(hits) >= DISCOVER_PER_HOUR:
        raise HTTPException(429, "ลองค้นหาเว็บบ่อยเกินไป รออีกสักพักแล้วลองใหม่")
    hits.append(now)
    _discover_hits[ip] = hits


class DiscoverIn(BaseModel):
    url: str = Field(min_length=4, max_length=500)


@app.post("/api/sources/discover")
async def discover_source(body: DiscoverIn, request: Request, session: Session) -> dict:
    from dataclasses import asdict

    from app.collector.discover import DiscoveryError, discover

    _rate_limit(request)
    try:
        d = await discover(body.url)
    except DiscoveryError as e:
        raise HTTPException(422, str(e)) from e
    existing = await _find_source(session, d.homepage, d.url)
    return {**asdict(d), "existing": existing}


async def _find_source(session: AsyncSession, homepage: str, url: str) -> dict | None:
    rows = (await session.scalars(select(Source))).all()
    for s in rows:
        cfg_url = (s.config or {}).get("url")
        if s.url.rstrip("/") == homepage.rstrip("/") or cfg_url == url:
            return {"id": s.id, "name": s.name, "status": s.status, "enabled": s.enabled}
    return None


class SubmitIn(BaseModel):
    kind: str = Field(pattern="^(rss|html)$")
    url: str = Field(max_length=500)
    homepage: str = Field(max_length=500)
    name: str = Field(min_length=2, max_length=120)
    pack: str
    listing: dict | None = None
    preview: list[dict] = []
    note: str | None = Field(None, max_length=500)


@app.post("/api/sources", status_code=201)
async def submit_source(body: SubmitIn, request: Request, session: Session) -> dict:
    """Queue a discovered source for an admin. Hidden from everyone until approved."""
    import hashlib
    import re as _re
    from urllib.parse import urlsplit

    from app.collector.discover import DiscoveryError, ensure_public, to_config

    _rate_limit(request)
    if body.pack not in PACKS:
        raise HTTPException(422, "unknown pack")
    try:
        await ensure_public(body.url)
    except DiscoveryError as e:
        raise HTTPException(422, str(e)) from e
    if existing := await _find_source(session, body.homepage, body.url):
        return {"status": "exists", "source": existing}
    host = urlsplit(body.homepage).hostname or "site"
    slug = _re.sub(r"[^a-z0-9]+", "-", host.removeprefix("www.").lower()).strip("-")[:40]
    sid = f"u-{slug}-{hashlib.sha1(body.url.encode()).hexdigest()[:4]}"
    session.add(
        Source(
            id=sid,
            name=body.name.strip(),
            url=body.homepage,
            enabled=False,
            pack=body.pack,
            status="pending",
            config=to_config(body.model_dump(), sid),
            submitted_at=now_bkk(),
            note=(body.note or "").strip() or None,
        )
    )
    await session.commit()
    return {"status": "pending", "id": sid}


@app.get("/api/admin/sources", dependencies=[Depends(check_jobs_token)])
async def admin_sources(session: Session) -> list[dict]:
    rows = (
        await session.scalars(
            select(Source).order_by(Source.submitted_at.desc().nulls_last(), Source.name)
        )
    ).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "url": s.url,
            "pack": s.pack,
            "enabled": s.enabled,
            "status": s.status,
            "user_added": s.config is not None,
            "config": s.config,
            "submitted_at": s.submitted_at,
            "note": s.note,
            "last_success_at": s.last_success_at,
            "last_error": s.last_error if s.consecutive_failures else None,
            "healthy": s.consecutive_failures < BROKEN_AFTER,
        }
        for s in rows
    ]


class Decision(BaseModel):
    pack: str | None = None
    name: str | None = Field(None, min_length=2, max_length=120)


@app.post("/api/admin/sources/{sid}/{action}", dependencies=[Depends(check_jobs_token)])
async def admin_decide(sid: str, action: str, body: Decision, session: Session) -> dict:
    s = await session.get(Source, sid)
    if s is None or s.config is None:
        raise HTTPException(404, "not a user-added source")
    if action not in ("approve", "reject"):
        raise HTTPException(422, "approve or reject")
    if body.pack:
        if body.pack not in PACKS:
            raise HTTPException(422, "unknown pack")
        s.pack = body.pack
    if body.name:
        s.name = body.name
    s.status = "approved" if action == "approve" else "rejected"
    s.enabled = action == "approve"
    await session.commit()
    return {"id": s.id, "status": s.status}


@app.get("/api/admin/overview", dependencies=[Depends(check_jobs_token)])
async def admin_overview(session: Session) -> dict:
    from app import notify

    today = now_bkk().date()
    pending = await session.scalar(
        select(func.count()).select_from(Source).where(Source.status == "pending")
    )
    return {
        "pending_sources": pending,
        "announcements": await session.scalar(
            select(func.count()).select_from(visible().subquery())
        ),
        "extraction": await _extraction_counts(session),
        "users": await session.scalar(select(func.count()).select_from(User)),
        "reminders_set": await session.scalar(select(func.count()).select_from(Reminder)),
        "pushes_this_month": await notify.pushes_this_month(session, today),
        "push_monthly_limit": get_settings().push_monthly_limit,
        "last_run": _last_run,
    }


@app.get("/api/tags")
async def tags(session: Session, limit: int = Query(30, ge=1, le=100)) -> list[dict]:
    """Popular tags on posts from the last four months, for chips and the follow page."""
    since = now_bkk() - timedelta(days=120)
    tag = func.unnest(Announcement.tags).label("tag")
    sub = visible().with_only_columns(tag).where(Announcement.first_seen_at >= since).subquery()
    rows = await session.execute(
        select(sub.c.tag, func.count())
        .group_by(sub.c.tag)
        .order_by(func.count().desc(), sub.c.tag)
        .limit(limit)
    )
    return [{"tag": t, "count": n} for t, n in rows.all()]
