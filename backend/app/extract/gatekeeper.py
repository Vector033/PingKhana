"""Two-stage gate for social posts (Facebook / Instagram feeds through a public bridge).

Social feeds mix real announcements with job seekers, scams and chatter. Stage 1 is a few
regexes that drop the obvious ones for free. Stage 2 is Gemini's intent answer, asked in the
same call as the extraction. Unsure answers wait for an admin instead of guessing.

Status values on Announcement.moderation_status: published | filtered_out | pending_review.
"""

import re

from app.extract.schema import Extracted

# Obvious scams / ads.
SCAM_PATTERNS = [
    r"งานออนไลน์.{0,40}รายได้",
    r"กดไลก์.{0,30}ได้เงิน",
    r"ตอบแชทลูกค้า.{0,30}วันละ",
    r"ฝากร้าน",
    r"ไม่ต้องมีประสบการณ์.{0,40}รับเงินรายวัน",
    r"รายได้.{0,10}(หลักหมื่น|หลักแสน).{0,20}(ต่อวัน|ต่อสัปดาห์|ทำที่บ้าน)",
]

# Someone looking for work, written at the start of the post.
JOB_SEEKER_PATTERNS = [
    r"^(ตาม|กำลัง)?หางาน(ทำ)?(ครับ|ค่ะ|คับ|คะ)",
    r"^(เด็ก)?จบใหม่.{0,60}หางาน",
    r"^หาที่ฝึกงาน.{0,60}(ครับ|ค่ะ|คะ)",
    r"^ฝากเนื้อฝากตัว.{0,60}(หางาน|งาน)",
    r"^รับงานฟรีแลนซ์",
    r"^(สนใจ|อยาก)(ทำงาน|สมัครงาน).{0,40}(ครับ|ค่ะ)",
]

# A hiring entity's words: a post with these is never dropped as a job seeker by Stage 1.
HIRING_WORDS = re.compile(
    r"รับสมัคร|เปิดรับ|ประกาศรับ|ต้องการ(รับ)?(พนักงาน|ผู้|ตำแหน่ง)|we.?re hiring|hiring", re.I
)

_SCAM = re.compile("|".join(SCAM_PATTERNS))
_SEEKER = re.compile("|".join(JOB_SEEKER_PATTERNS))

PUBLISHABLE = {"official_announcement", "hiring_post"}
CONFIDENCE = 0.75


def prefilter(text: str) -> tuple[str, str] | None:
    """Stage 1: (post_intent, reason) when the post is obviously not publishable, else None."""
    t = " ".join(text.split())
    if m := _SCAM.search(t):
        return "spam_or_scam", f"ตรงรูปแบบโฆษณา/หลอกลวง: “{m.group(0)[:40]}”"
    head = t[:200]
    if (m := _SEEKER.search(head)) and not HIRING_WORDS.search(t):
        return "job_seeker", f"ตรงรูปแบบคนหางาน: “{m.group(0)[:40]}”"
    return None


def decide(r: Extracted) -> tuple[str, str | None, str | None]:
    """Stage 2: (moderation_status, post_intent, rejection_reason) from Gemini's answer."""
    intent = r.post_intent
    if intent is None:
        return "pending_review", None, "ยังไม่ได้จัดประเภท (ไม่มีคำตอบจาก AI)"
    conf = r.confidence if r.confidence is not None else 0.0
    if conf < CONFIDENCE:
        return "pending_review", intent, f"AI ไม่แน่ใจ ({intent}, ความมั่นใจ {conf:.2f})"
    if intent in PUBLISHABLE:
        if r.is_publishable is False:
            return "pending_review", intent, r.rejection_reason or "ประเภทกับผลตัดสินขัดกัน"
        return "published", intent, None
    return "filtered_out", intent, r.rejection_reason or intent
