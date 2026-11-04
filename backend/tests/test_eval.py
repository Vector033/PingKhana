"""Guard the deadline extractor against regressions on both evaluation sets."""

import pytest

from eval.run_deadline_eval import run


@pytest.mark.parametrize("case_set", ["dev", "holdout"])
async def test_rules_accuracy_does_not_regress(case_set: str) -> None:
    result = await run("rules", case_set)
    assert result["accuracy"] >= 0.95, result["failures"]
