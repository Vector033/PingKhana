"""Measure deadline extraction accuracy.

    python -m eval.run_deadline_eval            # rule-based extractor
    python -m eval.run_deadline_eval --gemini   # Gemini (needs GEMINI_API_KEY)
    python -m eval.run_deadline_eval --set holdout   # cases collected without seeing the code

A case counts as correct when the extracted date equals the expected one, or both are empty.
Results are written to eval/results/<method>.json so the README numbers can be traced.
"""

import argparse
import asyncio
import json
import sys
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


async def run(method: str, case_set: str = "dev") -> dict:
    cases = load_cases(case_set)
    extractor = None
    if method == "gemini":
        from app.config import get_settings
        from app.extract.gemini import GeminiExtractor

        s = get_settings()
        if not s.gemini_api_key:
            sys.exit("GEMINI_API_KEY is not set")
        extractor = GeminiExtractor(s.gemini_api_key, s.gemini_model)

    per_kind: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    rows = []
    for c in cases:
        if extractor:
            got = (await extractor.extract(c["title"], c["text"], c["ref"])).deadline
        else:
            got = rules.extract(c["title"], c["text"], c["ref"]).deadline
        ok = got == c["expected"]
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
    p.add_argument("--set", choices=list(CASE_FILES), default="dev")
    a = p.parse_args()
    s = asyncio.run(run("gemini" if a.gemini else "rules", a.set))
    print(f"{s['method']} on {s['set']}: {s['correct']}/{s['total']} = {s['accuracy']:.1%}")
    for k, v in s["by_kind"].items():
        print(f"  {k:<10} {v['correct']}/{v['total']} = {v['accuracy']:.1%}")
    for f in s["failures"]:
        print(f"  FAIL {f['id']}: expected {f['expected']} got {f['got']}")


if __name__ == "__main__":
    main()
