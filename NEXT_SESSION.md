# PingKhana: เริ่ม session ใหม่ (2026-11-22)

อ่านไฟล์นี้ก่อน แล้วอ่าน `HANDOFF.md` (สถานะ live + วิธีรันบนเครื่อง) และ `CLAUDE.md`

## วิธีทำงานกับผู้ใช้
- ตอบภาษาไทย สั้น ประหยัดโทเคน: เปิด skill **`caveman:caveman`** ตั้งแต่ข้อความแรก
- เขียนโค้ด/แก้บั๊ก: ใช้ **`ponytail:ponytail`** (แก้น้อยที่สุดที่แก้ได้จริง ไม่ over-engineer) · รีวิว: `ponytail:ponytail-review`
- งานหน้าเว็บ/ดีไซน์: อ่าน **`CLAUDE_DESIGN_GUIDE.md`** ก่อน (เป็นข้อกำหนดหลัก) แล้วใช้ **`landing-page-design`** (ชุด elayadesign/ai-design-skills) + **`no-ai-design-slop`** (กันหน้าตาแบบ AI ทั่วไป) + `audit-ai-design-slop` (ตรวจ) และ `impeccable:impeccable` ถ้าต้อง polish
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

## Session ล่าสุด (2026-11-10 ถึง 13): ดีไซน์หน้าเว็บ
1. Gemini redesign ธีม "Live Intelligence Radar" + `RadarShader` (WebGL) ใน hero แล้วตรวจบั๊กและแก้ล้นจอมือถือ
2. ขัดตาม `CLAUDE_DESIGN_GUIDE.md` (`4f93204`): ถอดของประดับที่ไม่ผ่าน removal test (แถบ SCAN 1H, noise, เส้นโค้ง), shader ถูกลง, แก้ LCP ของโปสเตอร์, แถบปุ่ม LINE ติดล่างจอมือถือ, แท็ก 44px, skeleton รูปการ์ด · ผู้ใช้เลือก **เก็บ shader ไว้**
3. แก้คู่มือให้ตรงกับของจริง (`bad7248`) และแคปภาพหน้าจอใหม่ขึ้น GitHub (`d6e4fdc`)
4. ตรวจผ่าน: ไม่ล้นจอทุก route ที่ 360–1280, contrast AA ทั้ง light/dark, keyboard focus, reduced-motion, eslint/tsc/build, Playwright 32/32, CI เขียว, Vercel deploy แล้ว

## 2026-11-14
เพิ่ม 4 คณะ มช. (RSS), ตัดประกาศจัดซื้อจัดจ้าง, แจ้งเตือนแหล่งพังผ่าน GitHub Actions, เอาตัวกรองชั้นปีออก (รายละเอียดใน HANDOFF.md)

## 2026-11-22: ทำ MASTER_ROADMAP ครบ 3 เฟส (deploy แล้ว)
- Phase 1 ตัวกรองแบบกลาง + เลือกสถาบัน + ปุ่มติดตามบนการ์ด · Phase 2 รายละเอียดตามหมวด ไม่มีป้าย "ไม่ระบุ" · Phase 3 โพสต์โซเชียลผ่าน bridge + ด่านคัดกรอง 2 ชั้น + คิวแอดมิน
- ตัวกรองยุบเหลือ 2 แถว (แท็กอยู่หลังปุ่มค้นหา) · workflow Collect เปลี่ยนเป็น background=1
- ยังเหลือให้ผู้ใช้ตัดสิน: จะใส่ ครูบ้านนอก / ธรรมศาสตร์ ไหม (รายละเอียดใน HANDOFF.md)

## บทเรียนที่ต้องจำ
- ผู้ใช้สั่งงานด้วย `MASTER_ROADMAP.md` / `PROMPT_FOR_CLAUDE.md` (ไม่ได้ commit ไว้ เป็นไฟล์ของผู้ใช้) ทำทีละเฟส แล้วหยุดรอรีวิว
- เทสต์ที่ใช้ `factories.NOW` (1 ต.ค. 2026) กับ API ที่ใช้วันที่จริง จะพังเมื่อเวลาผ่านไป (กฎโพสต์ไม่มีวันที่ 45 วัน) ให้ตั้งวันที่ในเทสต์เป็นปัจจุบัน
- auto mode อาจบล็อก push ไฟล์ใน `.github/workflows/` ถ้าผู้ใช้ไม่ได้สั่งตรงๆ ให้ถามก่อน
- Facebook: robots.txt ห้ามทุกบอท และกลุ่มต้องล็อกอิน → ห้ามดึง ใช้ได้เฉพาะ bridge ที่ถูกกฎ
- Next 16: `<Image priority>` เลิกใช้แล้ว ใช้ `loading="eager"` + `fetchPriority="high"` (ดู `node_modules/next/dist/docs/` ก่อนใช้ API ของ Next เสมอ)
- ตรวจหน้าเว็บด้วยสคริปต์ Playwright ของเราเอง ไม่พึ่ง Browser pane ที่ซ่อนอยู่ (รายละเอียดใน HANDOFF.md หัวข้อข้อควรรู้)
- ทดสอบ discovery กับเว็บจริง: รัน `discover()` จาก `backend/` ด้วย `PYTHONPATH=.` (ปิดขั้น Gemini ได้ถ้าไม่อยากเปลืองโควตา) · บน Windows curl ส่งภาษาไทยใน query ผิด ให้ใช้ Python/httpx
- removal test: ซ่อนเลเยอร์ตกแต่งทีละชั้นทั้ง light/dark ถ้าไม่มีใครสังเกตเห็นให้ลบ
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
- วัด shader บนมือถือจริง + ตรวจ Safari/iOS
- แคปภาพแชท LINE ชุดใหม่ (ชุดปัจจุบันจาก 2026-11-08)
- Prettier ไฟล์ที่ Gemini เขียนเมื่อแก้ไฟล์นั้น (รายชื่อใน HANDOFF.md)
- แคปภาพหน้าจอใหม่ (ตัวกรองเปลี่ยนแล้ว) · หาแหล่งงานให้กลุ่ม career · backfill details · ดู log Render ถ้าเจอ 502 อีก
