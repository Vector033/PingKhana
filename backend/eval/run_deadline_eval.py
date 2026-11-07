"""Measure deadline extraction accuracy.

    python -m eval.run_deadline_eval            # rule-based extractor
    python -m eval.run_deadline_eval --gemini   # Gemini (needs GEMINI_API_KEY)
    python -m eval.run_deadline_eval --set holdout   # cases collected without seeing the code
    python -m eval.run_deadline_eval --llm typhoon-2.5-30b-a3b-instruct
        # any model behind an OpenAI-compatible endpoint; defaults to the local FreeLLMAPI router
        # (FREELLMAPI_URL, FREELLMAPI_KEY). Same prompt as Gemini.

A case counts as correct when the extracted date equals the expected one, or both are empty.
Results are written to eval/results/<method>.json so the README numbers can be traced.
"""

import argparse
import asyncio
import json
import os
import re
import sys
import time
from collections import defaultdict
from datetime import date
from pathlib import Path

import yaml

from app.collector.parsers import parse_detail
from app.collector.sources import load_sources
from app.extract import rules

ROOT = Path(__file__).parent
FIXTURES = ROOT.parent / "tests" / "fixtures" / "html"
DEFAULT_REF = date(2026, 11, 4)


CASE_FILES = {"dev": "deadline_cases.yaml", "holdout": "deadline_holdout.yaml"}


def load_cases(case_set: str = "dev") -> list[dict]:
    path = ROOT / CASE_FILES[case_set]
    cases = yaml.safe_load(path.read_text(encoding="utf-8"))["cases"]
    sources = {s.id: s for s in load_sources()}
    for c in cases:
        c["ref"] = c.get("ref") or DEFAULT_REF
        if c["kind"] == "page":
            html = (FIXTURES / f"{c['page']}.html").read_text(encoding="utf-8")
            d = parse_detail(html, sources[c["source"]], "", c["ref"])
            c["title"], c["text"] = d.title, d.text
        else:
            c["title"] = ""
    return cases


FREELLMAPI_URL = "http://127.0.0.1:31415/v1"


async def run(method: str, case_set: str = "dev", llm: str | None = None) -> dict:
    cases = load_cases(case_set)
    extractor = None
    if llm:
        from app.extract.openai_compat import OpenAICompatExtractor

        key = os.environ.get("FREELLMAPI_KEY")
        if not key:
            sys.exit("FREELLMAPI_KEY is not set")
        extractor = OpenAICompatExtractor(
            os.environ.get("FREELLMAPI_URL", FREELLMAPI_URL), key, llm, attempts=8
        )
        method = f"llm-{re.sub(r'[^A-Za-z0-9.]+', '-', llm)}"
    elif method == "gemini":
        from app.config import get_settings
        from app.extract.gemini import GeminiExtractor

        s = get_settings()
        if not s.gemini_api_key:
            sys.exit("GEMINI_API_KEY is not set")
        extractor = GeminiExtractor(
            s.gemini_api_key, s.gemini_model, fallback_models=s.gemini_fallbacks
        )

    per_kind: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    rows = []
    models: dict[str, int] = defaultdict(int)
    errors = 0
    started = time.monotonic()
    for c in cases:
        if extractor:
            try:
                r = await extractor.extract(c["title"], c["text"], c["ref"])
                got, models[r.method] = r.deadline, models[r.method] + 1
            except Exception as e:  # noqa: BLE001 - an API error counts as a miss, not a crash
                got = f"error: {e!r}"[:160]
                errors += 1
        else:
            got = rules.extract(c["title"], c["text"], c["ref"]).deadline
        ok = got == c["expected"]
        if extractor:  # LLM runs take minutes on free tiers; show progress
            print(
                f"  {len(rows) + 1}/{len(cases)} {c['id']} {'ok' if ok else 'MISS'}",
                file=sys.stderr,
                flush=True,
            )
        per_kind[c["kind"]][0] += ok
        per_kind[c["kind"]][1] += 1
        rows.append(
            {"id": c["id"], "kind": c["kind"], "expected": c["expected"], "got": got, "ok": ok}
        )

    correct = sum(v[0] for v in per_kind.values())
    total = sum(v[1] for v in per_kind.values())
    summary = {
        "method": method,
        "set": case_set,
        "accuracy": round(correct / total, 3),
        "correct": correct,
        "total": total,
        "answered_by": dict(models),
        "errors": errors,
        "seconds": round(time.monotonic() - started),
        "by_kind": {
            k: {"correct": v[0], "total": v[1], "accuracy": round(v[0] / v[1], 3)}
            for k, v in per_kind.items()
        },
        "failures": [r for r in rows if not r["ok"]],
    }
    out = ROOT / "results"
    out.mkdir(exist_ok=True)
    (out / f"{method}-{case_set}.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, default=str), encoding="utf-8"
    )
    return summary


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--gemini", action="store_true")
    p.add_argument("--llm", metavar="MODEL", help="model id on an OpenAI-compatible endpoint")
    p.add_argument("--set", choices=list(CASE_FILES), default="dev")
    a = p.parse_args()
    s = asyncio.run(run("gemini" if a.gemini else "rules", a.set, a.llm))
    print(f"{s['method']} on {s['set']}: {s['correct']}/{s['total']} = {s['accuracy']:.1%}")
    if s["answered_by"]:
        print(f"  answered by {s['answered_by']}")
    for k, v in s["by_kind"].items():
        print(f"  {k:<10} {v['correct']}/{v['total']} = {v['accuracy']:.1%}")
    for f in s["failures"]:
        print(f"  FAIL {f['id']}: expected {f['expected']} got {f['got']}")


if __name__ == "__main__":
    main()
