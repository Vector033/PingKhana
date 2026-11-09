from datetime import date, timedelta

from sqlalchemy import Select, and_, any_, literal, or_, select, true

from app.models import Announcement, Category, Source, User

# Users who never chose follow the student pack (the bot started as a CMU bot).
DEFAULT_PACKS = ["student"]


def user_packs(user: User | None) -> list[str]:
    return (user.packs if user is not None else None) or DEFAULT_PACKS


def in_packs(packs: list[str]):
    return Announcement.source_id.in_(select(Source.id).where(Source.pack.in_(packs)))


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
        return in_packs(DEFAULT_PACKS)
    conds = [in_packs(user_packs(user))]
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


def recent_if_undated(today: date):
    """A post without a deadline counts as current only if it is recent.

    Sites keep old posts on their list pages, and the collector sees them for the first time
    on its first run, so first_seen alone is not enough: the publish date must be recent, or,
    when the site shows none, the title must not name only past Buddhist years ("... 2567").
    """
    be = today.year + 543
    past_years = "|".join(str(y) for y in range(be - 15, be))
    current = f"{be}|{be + 1}"
    return or_(
        Announcement.deadline.is_not(None),
        Announcement.published_on >= today - timedelta(days=120),
        and_(
            Announcement.published_on.is_(None),
            Announcement.first_seen_at >= today - timedelta(days=45),
            or_(
                ~Announcement.title.op("~")(f"({past_years})"),
                Announcement.title.op("~")(f"({current})"),
            ),
        ),
    )


def open_in_category(category: Category, today: date, user: User | None, limit: int = 10):
    """Open announcements with a deadline first (soonest first), then recent ones without one."""
    return (
        visible()
        .where(
            Announcement.category == category.value,
            still_open(today),
            for_user(user),
            recent_if_undated(today),
        )
        .order_by(Announcement.deadline.asc().nulls_last(), Announcement.id.desc())
        .limit(limit)
    )


def latest_in_category(category: Category, today: date, user: User | None, limit: int = 10):
    return (
        visible()
        .where(
            Announcement.category == category.value,
            still_open(today),
            for_user(user),
            recent_if_undated(today),
        )
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
