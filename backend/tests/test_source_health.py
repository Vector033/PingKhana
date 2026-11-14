from datetime import UTC, datetime

from scripts.source_health import stale_sources

NOW = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)


def test_flags_old_and_failing_sources_only() -> None:
    sources = [
        {"id": "fresh", "healthy": True, "last_success_at": "2026-11-14T10:30:00.123456Z"},
        {"id": "old", "healthy": True, "last_success_at": "2026-11-14T05:59:00Z"},
        {
            "id": "failing",
            "healthy": False,
            "last_success_at": "2026-11-14T11:00:00Z",
            "last_error": "HTTP 503",
        },
        {"id": "new", "healthy": True, "last_success_at": None},
    ]
    bad = stale_sources(sources, NOW)
    assert [b.split("\t")[0] for b in bad] == ["old", "failing"]
    assert "HTTP 503" in bad[1]
