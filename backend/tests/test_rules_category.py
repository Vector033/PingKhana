from app.extract.rules import classify
from app.models import Category


def test_congratulations_on_a_position_is_general_not_job() -> None:
    title = 'ขอแสดงความยินดีกับ ผู้ช่วยศาสตราจารย์ ดร.ชาลินี ในโอกาสได้รับการแต่งตั้งให้ดำรงตำแหน่ง "รองศาสตราจารย์"'
    assert classify(title, "คณะพยาบาลศาสตร์ ขอแสดงความยินดี") == Category.GENERAL


def test_job_posting_still_job() -> None:
    title = "คณะสัตวแพทยศาสตร์ มช. รับสมัครตำแหน่ง เจ้าหน้าที่สำนักงาน จำนวน 1 อัตรา"
    assert classify(title, "รับสมัครงาน") == Category.JOB
