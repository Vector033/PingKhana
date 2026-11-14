"""Exit 1 when a source has not been read for 6 hours, or has failed 3 runs in a row.

    python -m scripts.source_health https://pingkhana-api.onrender.com   (from backend/)

Run every few hours by .github/workflows/source-health.yml; a failed run makes GitHub email the
repo owner. Only reads the public /api/stats, and uses the standard library only.
"""

import json
import sys
import urllib.request
from datetime import UTC, datetime, timedelta

MAX_AGE = timedelta(hours=6)


def stale_sources(sources: list[dict], now: datetime) -> list[str]:
    """One line per source that needs a look. A new source that has never run is not stale
    until it fails three times (then `healthy` turns false)."""
    out = []
    for s in sources:
        last = s.get("last_success_at")
        too_old = last is not None and now - datetime.fromisoformat(last) > MAX_AGE
        if not s.get("healthy", True) or too_old:
            out.append(f"{s['id']}\tlast ok: {last or 'never'}\t{s.get('last_error') or ''}")
    return out


def main(api: str) -> int:
    with urllib.request.urlopen(f"{api.rstrip('/')}/api/stats", timeout=120) as r:
        sources = json.load(r)["sources"]
    bad = stale_sources(sources, datetime.now(UTC))
    if bad:
        print("Sources not read in 6 hours or failing:")
        print("\n".join(bad))
        return 1
    print(f"all {len(sources)} sources read in the last 6 hours")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
