# PingKhana: สถานะส่งต่อ (2026-11-07)

ไฟล์นี้สรุปงานจาก session ที่สร้าง MVP (2026-11-04 ถึง 2026-11-07) ให้ session ถัดไปอ่านก่อนเริ่ม

## ทำเสร็จแล้ว (push ขึ้น main แล้ว, commit ล่าสุด 9716fe8)
- **Backend:** FastAPI + Postgres + Alembic ใน `backend/` มี 71 pytest ผ่านหมด
  - Collector ดึงจาก 5 เว็บ มช. ใน `backend/app/collector/sources.yaml` ผู้ใช้อนุมัติครบแล้ว
  - ตัวอ่านวันปิดรับแบบกฎ และ Gemini ที่ fallback ไปหลาย model เมื่อเจอ 503/404/timeout
  - LINE webhook, คำสั่งในแชท, ปุ่มเตือน 3 วันและ 1 วันก่อนปิดรับ, outbox ที่คุมโควตา push 300 ข้อความ/เดือน
  - LIFF API และ `/jobs/run`
- **Web:** Next.js 16 ใน `web/` มีหน้าแรก (ค้นหาและกรอง), หน้าประกาศ, `/sources` และ `/liff` มี 8 Playwright test
- **ผล eval วันปิดรับ** (ดูใน README)

  | ชุด | Rules | Gemini |
  |---|---|---|
  | dev | 100% (หลังจูน) | 97.9% |
  | held-out | 94.1% (รอบแรกแบบ blind) | 91.2% |

  รอบ Gemini ส่วนใหญ่ตอบโดย `gemini-flash-lite-latest` เพราะ model หลักติด 429/503
- **เตรียม deploy แล้ว**
  - `render.yaml` (API บน Render free, Docker, Singapore) ผ่าน schema ทางการ และลองรัน Docker image ที่ port 10000 ได้
  - `DATABASE_URL` รับ connection string ของ Neon ได้ตรงๆ (แปลง `sslmode` และตัด `channel_binding` ให้เอง)
  - ขั้นตอนครบอยู่ใน `docs/line-setup.md` หัวข้อ 3 (Neon → Render → Vercel → LIFF → GitHub Actions + cron-job.org)
- **Key ใน `backend/.env`** (ไม่ได้อยู่ใน git): LINE secret, token และ login channel ID ใช้ได้ (บอท `@524osura`, โควตา 300) Gemini key ก็ใช้ได้ แต่ยังไม่มี `LIFF_ID` และ `JOBS_TOKEN`

## ยังเหลือ
1. **Deploy** (ผู้ใช้อนุมัติแล้ว 2026-11-04) ผู้ใช้ต้องสมัคร Neon, Render และ Vercel เอง แล้วส่ง URL มา จากนั้นค่อยทำต่อตามลำดับ
   - [ ] เช็ก `https://<render>/health`
   - [ ] ตั้ง Webhook URL ใน LINE ให้เป็น `/webhook` เปิด Use webhook และ Webhook redelivery แล้วกด Verify
   - [ ] Deploy เว็บบน Vercel โดยตั้ง Root Directory = `web` ใส่ env `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_LINE_ADD_FRIEND_URL=https://line.me/R/ti/p/@524osura` และ `NEXT_PUBLIC_LIFF_ID` ห้ามใส่ `NEXT_PUBLIC_DEV_LIFF`
   - [ ] แก้ `PUBLIC_WEB_URL` และ `CORS_ORIGINS` บน Render ถ้า URL ของ Vercel ไม่ใช่ `pingkhana.vercel.app`
   - [ ] สร้าง LIFF โดยให้ endpoint เป็น `https://<เว็บ>/liff` แล้วใส่ LIFF ID ทั้งใน Render และ Vercel (Vercel ต้อง Redeploy)
   - [ ] เพิ่ม GitHub repo variable `API_URL` และ secret `JOBS_TOKEN` (ค่าที่ Render สุ่มให้) แล้วกด Run workflow `collect.yml` ครั้งแรก
   - [ ] ตั้ง cron-job.org ให้เรียก `/health` ทุก 10 นาที กัน Render หลับ
   - [ ] ทดสอบด้วยบัญชีของผู้ใช้เอง: แอดบอท, พิมพ์คำสั่ง, กด "เตือนฉัน", เปิดหน้า LIFF และพิมพ์ "ยกเลิก"
2. **Gemini free quota ติด 429 เร็ว:** รอบเก็บข้อมูลแรกบน production จะต้องดึงข้อมูลจากประมาณ 68 ประกาศ ส่วนใหญ่จะ fallback ไปใช้ rules
   - ควรจำกัดจำนวนการเรียก Gemini ต่อรอบ หรือเว้นช่วงระหว่างการเรียก แล้วค่อยให้รอบถัดๆ ไป re-extract ด้วย Gemini
3. **Eval ที่เทียบกันได้จริง:** ใช้ FreeLLMAPI (`http://127.0.0.1:31415/v1`, ใช้ได้เฉพาะบนเครื่องนี้) เทียบหลาย model เช่น Typhoon กับ Gemini บนชุดทดสอบเดิม
   - ต้องเพิ่ม extractor แบบ OpenAI-compatible ใน `eval/run_deadline_eval.py` (ยังไม่ได้ทำ)
   - ใช้ได้กับ eval เท่านั้น เพราะ Render เรียก FreeLLMAPI ไม่ได้
4. **ดีไซน์หน้าเว็บ:** ยังไม่ได้ปรับตาม `CLAUDE_DESIGN_GUIDE.md` ที่อยู่ใน root ของ repo (ไฟล์นี้ยังไม่ได้ commit)
   - ใช้ skill เช่น `web-design-engineer`, `better-interface`, `audit-ai-design-slop`/`no-ai-design-slop`, `break-ui` (ลองชื่อไทยยาว/ไม่มีข้อมูล), `better-accessibility`, `ux-writing`
5. **README:** ใส่ตัวเลขผู้ใช้จริง (followers, reminders sent) หลัง launch
6. **CI:** ยังไม่เคยเช็กว่าผ่านบน GitHub เพราะ repo เป็น private และ `gh` ยังไม่ได้ login

## ข้อควรรู้บนเครื่อง
- **Postgres:** Docker container `pingkhana_db` port 54532 (มี DB ชื่อ `pingkhana` และ `pingkhana_test`)
- **Preview:** `pingkhana-api` (8100) และ `pingkhana-web` (3004) ตั้งไว้ใน `Desktop\.claude\launch.json`
- `backend/.env` มี LINE token จริงแล้ว API บนเครื่องจึงไม่ใช่ dry run และหน้า `/liff` บนเครื่องไม่รับ token `dev:` อีก (ต้องเว้น `LINE_LOGIN_CHANNEL_ID` ว่างถ้าจะทดสอบแบบ dev)

## กติกาจาก CLAUDE.md
- ตอบภาษาไทย
- ห้ามวาง secret ในแชท
- ห้าม broadcast
- ถามก่อน push, deploy หรือส่งข้อความถึงผู้ใช้จริงทุกครั้ง (สิทธิ์ push main ที่ได้รับนั้นใช้ได้แค่ session ที่แล้ว)
