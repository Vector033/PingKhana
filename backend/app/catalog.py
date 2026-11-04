"""Majors a user can pick in LIFF, with the words used to spot them in announcements.

Start with the Faculty of Science plus a few common CMU majors; extend as users ask.
"""

MAJORS: dict[str, dict[str, list[str] | str]] = {
    "cs": {"th": "วิทยาการคอมพิวเตอร์", "aliases": ["วิทยาการคอมพิวเตอร์", "computer science", "คอมพิวเตอร์"]},
    "data-science": {"th": "วิทยาการข้อมูล", "aliases": ["วิทยาการข้อมูล", "data science"]},
    "math": {"th": "คณิตศาสตร์", "aliases": ["คณิตศาสตร์", "mathematics"]},
    "stat": {"th": "สถิติ", "aliases": ["สถิติ", "statistics"]},
    "physics": {"th": "ฟิสิกส์", "aliases": ["ฟิสิกส์", "physics"]},
    "chemistry": {"th": "เคมี", "aliases": ["เคมี", "chemistry"]},
    "biology": {"th": "ชีววิทยา", "aliases": ["ชีววิทยา", "biology"]},
    "geology": {"th": "ธรณีวิทยา", "aliases": ["ธรณีวิทยา", "geology"]},
    "microbiology": {"th": "จุลชีววิทยา", "aliases": ["จุลชีววิทยา", "microbiology"]},
    "materials": {"th": "วัสดุศาสตร์", "aliases": ["วัสดุศาสตร์", "materials science"]},
    "engineering": {"th": "วิศวกรรมศาสตร์", "aliases": ["วิศวกรรม", "engineering"]},
    "camt": {"th": "CAMT (สื่อศิลปะและเทคโนโลยีสื่อ)", "aliases": ["camt", "ซอฟต์แวร์", "software engineering"]},
    "business": {"th": "บริหารธุรกิจ / บัญชี / เศรษฐศาสตร์", "aliases": ["บริหารธุรกิจ", "บัญชี", "เศรษฐศาสตร์", "business", "economics"]},
    "other": {"th": "อื่นๆ", "aliases": []},
}  # fmt: skip

YEARS = [1, 2, 3, 4, 5, 6]


def major_codes_in(text: str) -> list[str]:
    low = text.lower()
    found = [
        code
        for code, info in MAJORS.items()
        if any(alias in low for alias in info["aliases"])  # type: ignore[union-attr]
    ]
    # "คอมพิวเตอร์" alone is weak evidence when engineering is also mentioned
    if "cs" in found and "engineering" in found and "วิทยาการคอมพิวเตอร์" not in low:
        found.remove("cs")
    return found
