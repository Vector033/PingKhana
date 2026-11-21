"""Measure the social gate on eval/social_gate_cases.yaml.

    python -m eval.run_social_gate_eval            # Stage 1 (regex) only, no API calls
    python -m eval.run_social_gate_eval --gemini   # Stage 1 + Gemini intent (needs GEMINI_API_KEY)

Targets from the roadmap: >= 95% of hiring posts published (recall), and >= 95% of blocked posts
truly not hiring (precision). Posts left pending_review are counted as not published.
Results go to eval/results/social-gate-<mode>.json.
"""

import argparse
import asyncio
import json
from datetime import date
from pathlib import Path

import httpx
import yaml

from app.config import get_settings
from app.extract import gatekeeper
from app.extract.gemini import GeminiExtractor

ROOT = Path(__file__).parent
REF = date(2026, 11, 22)


async def run(use_gemini: bool) -> dict:
    cases = yaml.safe_load((ROOT / "social_gate_cases.yaml").read_text(encoding="utf-8"))["cases"]
    s = get_settings()
    rows = []
    async with httpx.AsyncClient(timeout=90) as client:
        ex = (
            GeminiExtractor(s.gemini_api_key, s.gemini_model, client, s.gemini_fallbacks)
            if use_gemini
            else None
        )
        for i, c in enumerate(cases):
            text = c["text"].strip()
            title = text.split("\n", 1)[0][:90]
            if gate := gatekeeper.prefilter(text):
                status, intent, reason, stage = "filtered_out", gate[0], gate[1], 1
            elif ex is None:
                status, intent, reason, stage = "pending_review", None, "stage 2 not run", 1
            else:
                if i:
                    await asyncio.sleep(s.gemini_min_interval_seconds)  # free tier pacing
                try:
                    r = await ex.extract(title, text, REF, social=True)
                    status, intent, reason = gatekeeper.decide(r)
                except Exception as e:  # noqa: BLE001 - count it, keep going
                    status, intent, reason = "pending_review", None, f"error: {e!r}"[:120]
                stage = 2
            rows.append({**c, "status": status, "intent": intent, "reason": reason, "stage": stage})

    hiring = [r for r in rows if r["expect"] == "publish"]
    blocked = [r for r in rows if r["status"] == "filtered_out"]
    published = [r for r in rows if r["status"] == "published"]
    summary = {
        "mode": "stage1+gemini" if use_gemini else "stage1",
        "cases": len(rows),
        "hiring_recall": sum(r["status"] == "published" for r in hiring) / len(hiring),
        "block_precision": (
            sum(r["expect"] == "block" for r in blocked) / len(blocked) if blocked else None
        ),
        "non_hiring_blocked": sum(
            r["status"] == "filtered_out" for r in rows if r["expect"] == "block"
        )
        / sum(r["expect"] == "block" for r in rows),
        "published_but_should_block": sum(r["expect"] == "block" for r in published),
        "pending_review": sum(r["status"] == "pending_review" for r in rows),
        "by_group": {
            g: {
                st: sum(r["status"] == st for r in rows if r["group"] == g)
                for st in ("published", "filtered_out", "pending_review")
            }
            for g in dict.fromkeys(r["group"] for r in rows)
        },
    }
    out = ROOT / "results" / f"social-gate-{summary['mode']}.json"
    out.write_text(
        json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2), "utf-8"
    )
    return summary


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--gemini", action="store_true")
    summary = asyncio.run(run(p.parse_args().gemini))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
