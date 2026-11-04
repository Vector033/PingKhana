from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    ARRAY,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Category(StrEnum):
    SCHOLARSHIP = "scholarship"  # ทุน
    INTERNSHIP = "internship"  # สหกิจ / ฝึกงาน
    JOB = "job"  # งาน
    ACTIVITY = "activity"  # กิจกรรม
    GENERAL = "general"  # ประกาศทั่วไป


CATEGORY_TH = {
    Category.SCHOLARSHIP: "ทุน",
    Category.INTERNSHIP: "สหกิจ/ฝึกงาน",
    Category.JOB: "งาน",
    Category.ACTIVITY: "กิจกรรม",
    Category.GENERAL: "ประกาศทั่วไป",
}


class Source(Base):
    """Runtime state of a source. The source definition itself lives in sources.yaml."""

    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text)


class FetchRun(Base):
    __tablename__ = "fetch_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # ok | skipped_interval | skipped_robots | http_error | parse_empty | error
    status: Mapped[str] = mapped_column(String(32))
    http_status: Mapped[int | None] = mapped_column(Integer)
    items_seen: Mapped[int] = mapped_column(Integer, default=0)
    items_new: Mapped[int] = mapped_column(Integer, default=0)
    items_changed: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"), index=True)
    url: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    # Title as shown on the list page; a change there (e.g. "ขยายเวลา") triggers a re-read.
    list_title: Mapped[str] = mapped_column(Text, default="")
    body_text: Mapped[str] = mapped_column(Text, default="")
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    # Set when the same content was already seen at another URL (cross-posted). Not notified again.
    duplicate_of_id: Mapped[int | None] = mapped_column(ForeignKey("announcements.id"))
    published_on: Mapped[date | None] = mapped_column(Date)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Extraction results
    category: Mapped[str] = mapped_column(String(32), default=Category.GENERAL, index=True)
    summary_th: Mapped[str | None] = mapped_column(Text)
    deadline: Mapped[date | None] = mapped_column(Date, index=True)
    deadline_text: Mapped[str | None] = mapped_column(Text)
    eligible_years: Mapped[list[int] | None] = mapped_column(ARRAY(Integer))
    eligible_majors: Mapped[list[str] | None] = mapped_column(ARRAY(String(64)))
    min_gpax: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    extraction_method: Mapped[str | None] = mapped_column(String(32))
    needs_extraction: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    # Digest matching runs once per announcement; set when it has been considered.
    matched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class User(Base):
    """A LINE follower. We keep only the userId, year, major and chosen categories."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    line_user_id: Mapped[str] = mapped_column(String(64), unique=True)
    year: Mapped[int | None] = mapped_column(Integer)
    major: Mapped[str | None] = mapped_column(String(64))
    categories: Mapped[list[str]] = mapped_column(
        ARRAY(String(32)), default=lambda: [c.value for c in Category if c != Category.GENERAL]
    )
    notify_new: Mapped[bool] = mapped_column(Boolean, default=True)
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    reminders: Mapped[list["Reminder"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class Reminder(Base):
    __tablename__ = "reminders"
    __table_args__ = (UniqueConstraint("user_id", "announcement_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    announcement_id: Mapped[int] = mapped_column(
        ForeignKey("announcements.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="reminders")


class Delivery(Base):
    """Outbox of everything we want to tell a user.

    `dedupe_key` makes sending idempotent: a job that runs twice cannot create the same
    reminder or digest twice. Rows that could not be pushed (no budget) stay `queued` and are
    attached to the next free reply message instead.
    """

    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32))  # digest | reminder_3d | reminder_1d
    announcement_ids: Mapped[list[int]] = mapped_column(ARRAY(Integer))
    dedupe_key: Mapped[str] = mapped_column(String(200), unique=True)
    # queued -> sent (push|reply) | failed | expired
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)
    channel: Mapped[str | None] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)
