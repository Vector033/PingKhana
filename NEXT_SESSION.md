# PingKhana: เริ่ม session ใหม่ (2026-11-09)

อ่านไฟล์นี้ก่อน แล้วอ่าน `HANDOFF.md` (สถานะ live + วิธีรันบนเครื่อง) และ `CLAUDE.md`

## วิธีทำงานกับผู้ใช้
- ตอบภาษาไทย สั้น ประหยัดโทเคน: เปิด skill **`caveman:caveman`** ตั้งแต่ข้อความแรก
- เขียนโค้ด/แก้บั๊ก: ใช้ **`ponytail:ponytail`** (แก้น้อยที่สุดที่แก้ได้จริง ไม่ over-engineer) · รีวิว: `ponytail:ponytail-review`
- งานหน้าเว็บ/ดีไซน์: ใช้ **`landing-page-design`** (ชุด elayadesign/ai-design-skills) + **`no-ai-design-slop`** (กันหน้าตาแบบ AI ทั่วไป) + `audit-ai-design-slop` (ตรวจ) และ `impeccable:impeccable` ถ้าต้อง polish
- ห้ามขอ secret ในแชท · ห้าม broadcast ใน LINE · ผู้ใช้อนุญาตให้ commit + push main ได้ (Render/Vercel deploy เอง)
- ถ้าผู้ใช้สั่ง "ทำต่อไปเรื่อยๆ" ให้ตัดสินใจเองตามความเหมาะสมของเว็บ ไม่ต้องถามทีละข้อ

## Session ก่อนทำอะไรไปบ้าง (2026-11-07 ถึง 09)
1. **Redesign เว็บ** แนวเว็บข่าว (อ้างอิง Pando template): แถบค้นหา + แท็บหมวดอยู่บนสุด, รูปจากประกาศ (og:image/โปสเตอร์), ข้อความไฮไลต์, การ์ด Lead/Compact, drawer ดูสรุป + ปุ่ม "ให้ LINE เตือน" (ซ่อนปุ่มและบอกเหตุผลถ้าไม่มีวันปิดรับ), light/dark, มือถือ/คอม, Playwright 32 ผ่าน
2. **Eval โมเดล** ผ่าน FreeLLMAPI (`--llm MODEL` ใน `backend/eval/run_deadline_eval.py`): ได้ผลจริงแค่ Typhoon (dev 77.1%, held-out 52.9%) โมเดลอื่นติดโควตาฟรี ตารางอยู่ใน README
3. **จำกัด Gemini ต่อรอบ** (`GeminiBudget` ใน `backend/app/extract/service.py`): 15 ครั้ง, เว้น 6 วิ, รวมไม่เกิน 4 นาที, timeout ต่อครั้ง, ตัดเมื่อ 429
4. **Deploy จริง**: Neon + Render + Vercel + cron-job.org (ทุกชั่วโมง, `background=1`) + GitHub Actions สำรอง · CI เขียว
5. **โตจากบอททุน มช. เป็นตัวอ่านข่าวหลายแหล่ง** (ครูคนหนึ่งขอข่าว ศธ.): โซนข่าว `/news`, ชุดแหล่งข่าว นักศึกษา/ครู/ทั่วไป, ติดตามด้วย cookie, เพิ่มแหล่งด้วยการวางลิงก์ (RSS หรือ Gemini หา selector) + หน้า `/admin`, แท็กจาก Gemini, Gemini อ่านโปสเตอร์และ PDF, รวมโพสต์ซ้ำข้ามเว็บ, .ics/Google Calendar/แชร์ LINE
6. **Google login (ไม่บังคับ)**: ปุ่มของเราเอง (GIS token flow) แก้กรอบขาวในโหมดมืด, ติดตามข้ามเครื่อง, ผูก LINE ด้วย `ผูก 123456` — ผู้ใช้ตั้งค่าแล้ว ใช้งานได้จริง
7. **LINE OA**: รูปโปรไฟล์ `docs/brand/line-profile.png`, ปก `docs/brand/line-cover.png` (1500×750), ข้อความช่วยเหลือพูดถึงครู/กลุ่มข่าว/ลิงก์เว็บ
8. **ภาพ portfolio**: `docs/screenshots/` + ภาพแชทบอทที่ครอปแล้ว 11 ภาพใน `docs/screenshots/line-demo/` (ตัดชื่อ/อีเมลผู้ใช้ออก) แสดงใน README หัวข้อ LINE bot walkthrough
9. **แก้ล่าสุด**: ประกาศเก่าที่ไม่มีวันปิดรับ (ปี 2566–2568) ไม่โผล่ใน "ทุนที่เปิดอยู่"/"กิจกรรมล่าสุด" และตัวกรอง "ยังเปิดรับ" อีก (`recent_if_undated` ใน `backend/app/queries.py`) · pytest 115 ผ่าน

## บทเรียนที่ต้องจำ
- moe.go.th, ksp.or.th บล็อก IP ต่างประเทศ → ปิดไว้ ใช้ moe360.blog แทน
- Gemini: ใช้ `gemini-3.6-flash` เป็นหลัก (`flash-latest` ค้าง)
- Vercel Hobby บางทีไม่ build หลัง push ถี่ๆ → `npx vercel deploy --prod` จากโฟลเดอร์ repo
- `next.config.ts` import ไฟล์โปรเจกต์ไม่ได้ → รายชื่อโฮสต์รูปซ้ำไว้ใน `web/src/lib/imageHosts.ts` (แก้สองที่)
- CI: ต้อง `npx next typegen` ก่อน `tsc`
- PIL บนเครื่องนี้วางสระ/วรรณยุกต์ไทยซ้อนไม่ได้ → ภาพที่เจนเองหลีกเลี่ยงคำไทยที่มีสระบน/ล่าง
- ห้ามดึง token จาก Git Credential Manager ใช้ `gh` (login เป็น Vector033)

## ไอเดียต่อ (ยังไม่มีใครสั่ง)
- รัน eval โมเดลอื่นอีกครั้งเมื่อโควตาฟรีกลับมา
- ตัวดึงข้อมูลที่รันในไทยสำหรับเว็บราชการที่บล็อกต่างประเทศ
- ชวนผู้ใช้จริงแล้วใส่ตัวเลขใน README
- ใช้ `landing-page-design` + `no-ai-design-slop` ตรวจหน้าเว็บอีกรอบ
