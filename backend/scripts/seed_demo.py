"""Insert a few made-up announcements so the website has something to show without scraping.

    python -m scripts.seed_demo          (from backend/, after `alembic upgrade head`)

Used by the end-to-end tests in CI. All titles are fictional and link to example.com.
"""

import asyncio
from datetime import datetime, timedelta

from sqlalchemy import delete

from app.config import BANGKOK
from app.db import SessionLocal
from app.models import Announcement, Category, Source

DEMO = [
    ("ทุนเรียนดีสำหรับนักศึกษาวิทยาการคอมพิวเตอร์ ปี 3", Category.SCHOLARSHIP, 5, [3], ["cs"], 3.0),
    (
        "รับสมัครนักศึกษาสหกิจศึกษา ตำแหน่ง Software Engineer Intern",
        Category.INTERNSHIP,
        12,
        [3, 4],
        None,
        None,
    ),
    ("ผู้ช่วยวิจัยโครงการ Data Platform (Part-time)", Category.JOB, 2, None, None, None),
    ("Workshop: เขียน FastAPI ให้พร้อม production", Category.ACTIVITY, 20, None, None, None),
    ("ประกาศปิดปรับปรุงห้องสมุดคณะ", Category.GENERAL, None, None, None, None),
]


# Tags as Gemini would give them, so the site's tag features have something to show.
DEMO_TAGS = {
    1: ["ทุนเรียนดี", "วิทยาการคอมพิวเตอร์"],
    2: ["ฝึกงานสายไอที"],
    3: ["งานพาร์ทไทม์"],
    4: ["อบรมฟรี"],
}


async def main() -> None:
    now = datetime.now(tz=BANGKOK)
    today = now.date()
    async with SessionLocal() as s:
        await s.execute(delete(Announcement).where(Announcement.source_id == "demo"))
        if await s.get(Source, "demo") is None:
            s.add(
                Source(id="demo", name="แหล่งข้อมูลตัวอย่าง", url="https://example.com/", enabled=False)
            )
            await s.flush()
        for i, (title, cat, days, years, majors, gpax) in enumerate(DEMO, start=1):
            s.add(
                Announcement(
                    source_id="demo",
                    url=f"https://example.com/demo/{i}",
                    title=title,
                    body_text=title,
                    content_hash=f"demo-{i}",
                    category=cat.value,
                    summary_th=f"(ข้อมูลตัวอย่าง) {title}",
                    deadline=today + timedelta(days=days) if days is not None else None,
                    deadline_text=None,
                    eligible_years=years,
                    eligible_majors=majors,
                    min_gpax=gpax,
                    published_on=today - timedelta(days=i),
                    first_seen_at=now,
                    last_seen_at=now,
                    needs_extraction=False,
                    extraction_method="demo",
                    matched_at=now,
                    tags=DEMO_TAGS.get(i),
                )
            )
        await s.commit()
    print(f"seeded {len(DEMO)} demo announcements")


if __name__ == "__main__":
    asyncio.run(main())
