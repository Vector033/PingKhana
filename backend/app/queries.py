from datetime import date, timedelta

from sqlalchemy import Select, and_, any_, literal, or_, select, true

from app.models import Announcement, Category, Source, User

# The LINE bot serves students until people can pick their own packs.
BOT_PACK = "student"


def in_pack(pack: str = BOT_PACK):
    return Announcement.source_id.in_(select(Source.id).where(Source.pack == pack))


def visible() -> Select[tuple[Announcement]]:
    """Announcements that are processed and not cross-posted duplicates."""
    return select(Announcement).where(
        Announcement.duplicate_of_id.is_(None), Announcement.needs_extraction.is_(False)
    )


def still_open(today: date):
    return or_(Announcement.deadline.is_(None), Announcement.deadline >= today)


def for_user(user: User | None):
    """Filter by what the user can apply for. Unknown profile fields never exclude anything."""
    if user is None:
        return in_pack()
    conds = [in_pack()]
    if user.year is not None:
        conds.append(
            or_(
                Announcement.eligible_years.is_(None),
                literal(user.year) == any_(Announcement.eligible_years),
            )
        )
    if user.major and user.major != "other":
        conds.append(
            or_(
                Announcement.eligible_majors.is_(None),
                literal(user.major) == any_(Announcement.eligible_majors),
            )
        )
    return and_(true(), *conds)


def open_in_category(category: Category, today: date, user: User | None, limit: int = 10):
    """Open announcements with a deadline first (soonest first), then recent ones without one."""
    return (
        visible()
        .where(
            Announcement.category == category.value,
            still_open(today),
            for_user(user),
            # Without a deadline, only recent posts count as "open".
            or_(
                Announcement.deadline.is_not(None),
                Announcement.first_seen_at >= today - timedelta(days=45),
            ),
        )
        .order_by(Announcement.deadline.asc().nulls_last(), Announcement.id.desc())
        .limit(limit)
    )


def latest_in_category(category: Category, today: date, user: User | None, limit: int = 10):
    return (
        visible()
        .where(Announcement.category == category.value, still_open(today), for_user(user))
        .order_by(Announcement.published_on.desc().nulls_last(), Announcement.id.desc())
        .limit(limit)
    )


def closing_soon(today: date, user: User | None, days: int = 14, limit: int = 10):
    q = visible().where(
        Announcement.deadline >= today,
        Announcement.deadline <= today + timedelta(days=days),
        for_user(user),
    )
    if user is not None and user.categories:
        q = q.where(Announcement.category.in_(user.categories))
    return q.order_by(Announcement.deadline.asc()).limit(limit)


def user_matches(user: User, a: Announcement, today: date) -> bool:
    """Python twin of the SQL filters, used when building digests."""
    if a.category not in (user.categories or []):
        return False
    if a.deadline is not None and a.deadline < today:
        return False
    if user.year is not None and a.eligible_years and user.year not in a.eligible_years:
        return False
    if (
        user.major
        and user.major != "other"
        and a.eligible_majors
        and user.major not in a.eligible_majors
    ):
        return False
    return True
