# PingKhana: สถานะส่งต่อ (2026-11-09)

## Live
- เว็บ: https://pingkhana.vercel.app (Vercel, deploy เองเมื่อ push main) · API: https://pingkhana-api.onrender.com (Render, auto-deploy, migration รันตอนเริ่ม)
- DB: Neon · บอท LINE `@524osura` · LIFF `2012375267-i6ogVExo`
- ตั้งเวลา: cron-job.org เรียก `POST /jobs/run?background=1` ทุกชั่วโมง และ `/health` ทุก 10 นาที ส่วน GitHub `collect.yml` เป็นตัวสำรอง (GitHub รันจริงประมาณทุก 5 ชั่วโมง)
- CI ผ่าน (pytest + Playwright) · `gh` login ไว้แล้ว (Vector033)

## ทำแล้ว (ตามแผน 9 ข้อ, 2026-11-08 ถึง 09)
1. **ข่าวสารแยกโซน** หน้าแรกแสดงเฉพาะสิ่งที่ต้องสมัคร (`kind=open`) ส่วนข่าวทั่วไปอยู่ที่ `/news`
   - ชุดแหล่งข่าว (pack): นักศึกษา มช. / ครู-ศึกษาธิการ / ทั่วไป
   - ชุดครู: สพฐ. (RSS), ครูอาชีพดอทคอม, ครูประถมดอทคอม
   - **moe.go.th และ ksp.or.th ปิดกั้นการเข้าจากต่างประเทศ** จึงปิดไว้ใน `sources.yaml` (เปิดได้ถ้าย้ายตัวดึงข้อมูลไปรันในไทย)
2. **ติดตาม**
   - บนเว็บ: `/follow` เก็บใน cookie ไม่ต้องมีบัญชี
   - ใน LINE: หน้า LIFF เลือก pack ได้ แล้วบอทส่งตาม pack ที่เลือก
3. **ปฏิทินและการแชร์**
   - ไฟล์ `.ics` (`/a/<id>/ics`) และลิงก์ Google Calendar มีแจ้งเตือนก่อน 3 วันและ 1 วัน
   - แชร์ใน LINE ได้ และมี og:image จากโปสเตอร์
4. **Gemini อ่านโปสเตอร์และ PDF:** ส่งไฟล์ไปในการเรียกครั้งเดียวกันกับข้อความ
   - PDF จาก Google Drive แปลงเป็นลิงก์ดาวน์โหลดตรง
   - งบที่เหลือในแต่ละรอบใช้อ่านซ้ำโพสต์ที่ยังไม่รู้วันปิดรับ
5. **เพิ่มแหล่งด้วยการวางลิงก์** (`/sources/new` → `app/collector/discover.py`)
   - กัน SSRF และเคารพ robots.txt
   - ใช้ RSS ถ้ามี ถ้าไม่มีให้ Gemini หา selector แล้วตรวจด้วยการ parse จริง
   - รอแอดมินอนุมัติที่ `/admin` (ใช้ JOBS_TOKEN เป็นรหัส) หน้านี้มีภาพรวมด้วย
6. **แท็กจาก Gemini:** ใช้แท็กเดิมก่อนสร้างใหม่ มีหน้า `?tag=`, `/api/tags` และติดตามแท็กได้ (ขึ้นเป็นแถวแยกบนหน้าแรก)
7. **รวมโพสต์ซ้ำข้ามเว็บ** (`app/collector/dedupe.py`) หน้าประกาศแสดงว่า "ลงในเว็บอื่นด้วย"
8. **Google login (เปิดเมื่อตั้งค่า):** ติดตามได้ข้ามเครื่อง และผูกกับ LINE ด้วยการพิมพ์ "ผูก 123456"
   - ยังปิดอยู่ จนกว่าผู้ใช้จะสร้าง Google OAuth Client ID (ขั้นตอนอยู่ใน `docs/line-setup.md` หัวข้อ 3.6)

## ผู้ใช้ต้องทำเอง
- **Google login (ถ้าต้องการ):** ทำตาม `docs/line-setup.md` หัวข้อ 3.6 แล้วใส่ `GOOGLE_CLIENT_ID` ใน Render และ `NEXT_PUBLIC_GOOGLE_CLIENT_ID` ใน Vercel
- ถ้า Render ไม่ได้สร้าง `SESSION_SECRET` ให้เองจาก render.yaml ให้กด Generate ในหน้า Environment
- ทดสอบปุ่มเขียว "ให้ LINE เตือน" บนมือถือ และหน้า LIFF (เลือก pack ครู)

## ยังเหลือ / ไอเดียต่อ
- Eval model อื่น (gpt-oss, qwen, gemini ผ่าน router) ติดโควตาแพ็กเกจฟรี ให้ลองใหม่วันอื่น
- ชวนผู้ใช้จริง (ครูคนที่ขอ + เพื่อน) แล้วใส่ตัวเลขใน README
- ตัวดึงข้อมูลที่รันในไทย สำหรับเว็บราชการที่ปิดกั้นต่างประเทศ (moe, ksp, สพป. บางเขต)

## ข้อควรรู้บนเครื่อง
- Postgres: Docker `pingkhana_db` port 54532 (มี DB `pingkhana`, `pingkhana_test`, `pingkhana_e2e`)
- Playwright:
  1. `cd backend` → `alembic upgrade head` + `python -m scripts.seed_demo` (ใช้ DATABASE_URL ของ `pingkhana_e2e`)
  2. เปิด API ที่ :8100 พร้อม `CORS_ORIGINS=http://localhost:3005` และ `JOBS_TOKEN=`
  3. `cd web && npm run build && npx playwright test`
- ภาพหน้าจอ: `cd web && BASE_URL=https://pingkhana.vercel.app node scripts/screenshots.mjs`
- ห้ามดึง token จาก Git Credential Manager (ระบบบล็อก) ตอนนี้ใช้ `gh` แทน

## กติกา
ตอบภาษาไทย · ห้าม secret ในแชท · ห้าม broadcast · ถามก่อน push/deploy ยกเว้นผู้ใช้อนุญาตใน session นั้น (2026-11-09 ผู้ใช้ให้ทำต่อเองได้)
