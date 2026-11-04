from datetime import date

import pytest

from app.extract.thaidate import find_dates, find_deadline, resolve_year

REF = date(2026, 10, 1)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("20 ต.ค. 2569", date(2026, 10, 20)),
        ("20 ตุลาคม พ.ศ. 2569", date(2026, 10, 20)),
        ("๒๐ ตุลาคม ๒๕๖๙", date(2026, 10, 20)),
        ("20 ต.ค. 69", date(2026, 10, 20)),
        ("20 ต.ค 69", date(2026, 10, 20)),
        ("20 October 2026", date(2026, 10, 20)),
        ("October 20, 2026", date(2026, 10, 20)),
        ("Oct 20th 2026", date(2026, 10, 20)),
        ("20/10/2569", date(2026, 10, 20)),
        ("20/10/2026", date(2026, 10, 20)),
        ("2026-10-20", date(2026, 10, 20)),
        ("20 ตุลาคม", date(2026, 10, 20)),
        ("15 ม.ค. 2570", date(2027, 1, 15)),
    ],
)
def test_single_date_formats(text: str, expected: date) -> None:
    found = find_dates(text, REF)
    assert [f.value for f in found] == [expected]


def test_range_returns_both_ends_and_borrows_year() -> None:
    found = find_dates("รับสมัคร 1 ก.ย. – 20 ต.ค. 2569", REF)
    assert [f.value for f in found] == [date(2026, 9, 1), date(2026, 10, 20)]


def test_same_month_range_returns_end_day() -> None:
    found = find_dates("รับสมัครระหว่างวันที่ 1 – 20 ตุลาคม 2569", REF)
    assert [f.value for f in found] == [date(2026, 10, 20)]


def test_year_less_date_near_new_year_rolls_forward() -> None:
    assert find_dates("ภายใน 10 มกราคม", date(2026, 12, 1))[0].value == date(2027, 1, 10)


def test_two_digit_year_resolution() -> None:
    assert resolve_year("69", REF, 10, 20) == 2026  # BE 2569
    assert resolve_year("26", REF, 10, 20) == 2026  # CE 2026


def test_no_false_positive_on_numbers() -> None:
    assert find_dates("GPAX ไม่ต่ำกว่า 2.75 จำนวน 10 ทุน ทุนละ 20,000 บาท", REF) == []


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("หมดเขตรับสมัคร 20 ต.ค. 2569", date(2026, 10, 20)),
        ("ส่งใบสมัครได้ภายในวันที่ 31 ตุลาคม 2569", date(2026, 10, 31)),
        ("ประกาศ ณ วันที่ 1 ตุลาคม 2569\nปิดรับสมัคร 15 ตุลาคม 2569", date(2026, 10, 15)),
        (
            "เปิดรับสมัครตั้งแต่วันที่ 1 – 20 ตุลาคม 2569 สัมภาษณ์วันที่ 25 ตุลาคม 2569",
            date(2026, 10, 20),
        ),
        ("Application deadline: November 5, 2026", date(2026, 11, 5)),
        ("Apply by 2026-11-05.", date(2026, 11, 5)),
    ],
)
def test_find_deadline(text: str, expected: date) -> None:
    d = find_deadline(text, REF)
    assert d is not None and d.value == expected


def test_event_date_is_not_a_deadline() -> None:
    assert find_deadline("ขอเชิญเข้าร่วมกิจกรรม วันที่ 20 ตุลาคม 2569 ณ ห้อง SCB1100", REF) is None
