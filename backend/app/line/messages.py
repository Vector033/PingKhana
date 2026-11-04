"""LINE message builders. Every announcement links to its source and carries the disclaimer."""

from datetime import date
from typing import Any

from app.config import get_settings
from app.models import CATEGORY_TH, Announcement, Category

DISCLAIMER = "PingKhana ไม่ใช่ช่องทางทางการของคณะหรือมหาวิทยาลัย โปรดตรวจสอบรายละเอียดที่ประกาศต้นทาง"

_TH_MONTHS = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
]
_CAT_COLOR = {
    Category.SCHOLARSHIP: "#0B7A53",
    Category.INTERNSHIP: "#1D4ED8",
    Category.JOB: "#9333EA",
    Category.ACTIVITY: "#C2410C",
    Category.GENERAL: "#475569",
}


def th_date(d: date) -> str:
    return f"{d.day} {_TH_MONTHS[d.month - 1]} {(d.year + 543) % 100:02d}"


def days_left_text(deadline: date, today: date) -> str:
    n = (deadline - today).days
    if n < 0:
        return "ปิดรับแล้ว"
    if n == 0:
        return "ปิดรับวันนี้"
    return f"เหลือ {n} วัน"


def text(msg: str, quick: bool = True) -> dict[str, Any]:
    m: dict[str, Any] = {"type": "text", "text": msg[:5000]}
    if quick:
        m["quickReply"] = quick_reply()
    return m


def quick_reply() -> dict[str, Any]:
    items = [
        ("ทุนที่เปิดอยู่", "ทุนที่เปิดอยู่"),
        ("สหกิจล่าสุด", "สหกิจล่าสุด"),
        ("ใกล้ปิดรับ", "ใกล้ปิดรับ"),
        ("เตือนของฉัน", "เตือนของฉัน"),
        ("ตั้งค่า", "ตั้งค่า"),
    ]
    return {
        "items": [
            {"type": "action", "action": {"type": "message", "label": label, "text": t}}
            for label, t in items
        ]
    }


def bubble(a: Announcement, today: date, reminded: bool = False) -> dict[str, Any]:
    cat = Category(a.category)
    body: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": CATEGORY_TH[cat],
            "size": "xs",
            "weight": "bold",
            "color": _CAT_COLOR[cat],
        },
        {
            "type": "text",
            "text": a.title[:120],
            "weight": "bold",
            "size": "md",
            "wrap": True,
            "maxLines": 3,
        },
    ]
    if a.summary_th:
        body.append(
            {
                "type": "text",
                "text": a.summary_th[:300],
                "size": "sm",
                "wrap": True,
                "color": "#334155",
                "maxLines": 5,
            }
        )
    if a.deadline:
        body.append(
            {
                "type": "text",
                "text": f"ปิดรับ {th_date(a.deadline)} · {days_left_text(a.deadline, today)}",
                "size": "sm",
                "weight": "bold",
                "color": "#B91C1C" if (a.deadline - today).days <= 3 else "#0F172A",
            }
        )
    body.append(
        {"type": "text", "text": DISCLAIMER, "size": "xxs", "color": "#94A3B8", "wrap": True}
    )

    footer: list[dict[str, Any]] = [
        {
            "type": "button",
            "style": "link",
            "height": "sm",
            "action": {"type": "uri", "label": "เปิดประกาศต้นทาง", "uri": a.url},
        }
    ]
    if a.deadline and a.deadline >= today:
        footer.insert(
            0,
            {
                "type": "button",
                "style": "secondary" if reminded else "primary",
                "height": "sm",
                "color": None if reminded else "#0F766E",
                "action": {
                    "type": "postback",
                    "label": "ยกเลิกเตือน" if reminded else "เตือนฉัน",
                    "data": f"action={'unremind' if reminded else 'remind'}&id={a.id}",
                    "displayText": f"{'ยกเลิกเตือน' if reminded else 'เตือนฉัน'}: {a.title[:40]}",
                },
            },
        )
        footer[0] = {k: v for k, v in footer[0].items() if v is not None}
    return {
        "type": "bubble",
        "size": "kilo",
        "body": {"type": "box", "layout": "vertical", "spacing": "sm", "contents": body},
        "footer": {"type": "box", "layout": "vertical", "spacing": "xs", "contents": footer},
    }


def carousel(
    alt: str, anns: list[Announcement], today: date, reminded_ids: set[int] | None = None
) -> dict[str, Any]:
    reminded_ids = reminded_ids or set()
    bubbles = [bubble(a, today, a.id in reminded_ids) for a in anns[:11]]
    more_url = get_settings().public_web_url
    bubbles.append(
        {
            "type": "bubble",
            "size": "kilo",
            "body": {
                "type": "box",
                "layout": "vertical",
                "justifyContent": "center",
                "contents": [
                    {
                        "type": "text",
                        "text": "ดูประกาศทั้งหมด ค้นหาและกรองได้ที่เว็บ",
                        "wrap": True,
                        "align": "center",
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "action": {"type": "uri", "label": "เปิดเว็บ PingKhana", "uri": more_url},
                    }
                ],
            },
        }
    )
    return {
        "type": "flex",
        "altText": alt[:400],
        "contents": {"type": "carousel", "contents": bubbles},
        "quickReply": quick_reply(),
    }
