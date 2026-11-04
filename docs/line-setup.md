# ต่อ LINE จริงและ deploy

ขั้นตอนเหล่านี้ต้องทำเองเพราะต้องใช้บัญชีของคุณ **ห้ามวาง channel secret หรือ access token ในแชท** ให้ใส่ใน `.env` หรือในหน้าตั้งค่าของ host เท่านั้น

## 1. Messaging API channel (ตัวบอท)
1. ไปที่ https://developers.line.biz/console/ แล้วสร้าง Provider เช่น "PingKhana"
2. สร้าง **Messaging API channel** ระบบจะสร้าง LINE Official Account แบบฟรีให้ด้วย (ส่ง push ได้ 300 ข้อความ/เดือน)
3. แท็บ Basic settings ให้คัดลอก **Channel secret** ไปใส่ `LINE_CHANNEL_SECRET`
4. แท็บ Messaging API ให้ออก **Channel access token (long-lived)** ไปใส่ `LINE_CHANNEL_ACCESS_TOKEN`
5. ตั้ง Webhook URL เป็น `https://<backend>/webhook` เปิด **Use webhook** แล้วกด Verify
6. ใน LINE Official Account Manager ให้ปิด Auto-reply และ Greeting message (บอทตอบเอง)
7. คัดลอกลิงก์เพิ่มเพื่อน `https://line.me/R/ti/p/@xxxx` ไปใส่ `NEXT_PUBLIC_LINE_ADD_FRIEND_URL` ของเว็บ

## 2. LINE Login channel + LIFF (หน้าตั้งค่า)
1. ใน Provider เดียวกัน สร้าง **LINE Login channel**
2. คัดลอก Channel ID ไปใส่ `LINE_LOGIN_CHANNEL_ID` ของ backend (ใช้ตรวจ ID token)
3. แท็บ LIFF ให้ Add แบบ Size: Tall, Endpoint URL: `https://<web>/liff`, Scope: `openid`
4. คัดลอก LIFF ID ไปใส่ `LIFF_ID` (backend) และ `NEXT_PUBLIC_LIFF_ID` (web)
5. ไม่บังคับ: ทำ Rich menu ใน OA Manager มีปุ่ม "ทุนที่เปิดอยู่", "ใกล้ปิดรับ", "เตือนของฉัน" (ให้ส่งข้อความตามชื่อปุ่ม) และ "ตั้งค่า" (ลิงก์ไป `https://liff.line.me/<LIFF_ID>`)

เมื่อใส่ `LINE_LOGIN_CHANNEL_ID` แล้ว backend จะไม่รับ token แบบ `dev:` อีก

## 3. Deploy (ฟรีทั้งหมด: Neon + Render + Vercel)

ทำตามลำดับนี้ เพราะแต่ละขั้นต้องใช้ URL จากขั้นก่อนหน้า ค่าลับทุกตัวให้พิมพ์ในหน้าเว็บของ host เท่านั้น

### 3.1 Database: Neon
1. สมัครที่ https://neon.tech แล้วสร้าง project โดยเลือก region **AWS Asia Pacific (Singapore)** ให้อยู่ใกล้ Render
2. กด Connect แล้ว **ปิด Connection pooling** จากนั้นคัดลอก connection string (`postgresql://...?sslmode=require...`) ไว้ ไม่ต้องแก้อะไร backend แปลงให้ใช้กับ asyncpg เอง
   - เลือก Neon เพราะ Postgres ฟรีของ Render จะถูกลบหลังผ่านไป 30 วัน

### 3.2 Backend: Render (ใช้ `render.yaml` ใน repo)
1. สมัครที่ https://render.com ด้วยบัญชี GitHub แล้วอนุญาตให้เข้าถึง repo `PingKhana`
2. เปิด https://dashboard.render.com/blueprint/new?repo=https://github.com/Vector033/PingKhana
3. Render จะถามค่าที่ตั้งเป็น `sync: false` ให้ใส่ดังนี้
   - `DATABASE_URL` คือ connection string จาก Neon
   - `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_LOGIN_CHANNEL_ID`, `GEMINI_API_KEY` ใช้ค่าเดียวกับใน `backend/.env`
   - `LIFF_ID` ถ้ายังไม่มี ให้เว้นว่างไว้ก่อน
   - `PUBLIC_WEB_URL` และ `CORS_ORIGINS` ใส่ `https://pingkhana.vercel.app` ไปก่อน แล้วแก้ทีหลังถ้า Vercel ให้ชื่ออื่น
   - `JOBS_TOKEN` Render สุ่มให้เอง
4. กด Apply แล้วรอจน deploy เสร็จ จะได้ URL ประมาณ `https://pingkhana-api.onrender.com` เปิด `/health` แล้วต้องเห็น `{"ok":true}`
5. ใน LINE Developers → Messaging API ตั้ง Webhook URL เป็น `https://pingkhana-api.onrender.com/webhook` เปิด **Use webhook** และ **Webhook redelivery** แล้วกด Verify

แพ็กเกจฟรีของ Render จะหยุดเครื่องถ้าไม่มีคนเรียกนาน 15 นาที และใช้เวลาประมาณ 1 นาทีกว่าจะกลับมา ข้อความแรกหลังเครื่องหยุดอาจตอบช้า แก้ได้ด้วยข้อ 3.5

### 3.3 Web: Vercel
1. สมัครที่ https://vercel.com ด้วยบัญชี GitHub → Add New → Project → Import `PingKhana`
2. ตั้ง **Root Directory = `web`** และตั้งชื่อ project เป็น `pingkhana` ถ้าว่าง
3. Environment Variables (ห้ามใส่ `NEXT_PUBLIC_DEV_LIFF`)
   - `NEXT_PUBLIC_API_URL` = URL ของ Render
   - `NEXT_PUBLIC_LINE_ADD_FRIEND_URL` = `https://line.me/R/ti/p/@<basic id ของบอท>`
   - `NEXT_PUBLIC_LIFF_ID` = LIFF ID (ใส่ทีหลังได้ แต่ต้อง Redeploy หลังใส่)
4. กด Deploy ถ้า URL ที่ได้ไม่ใช่ `https://pingkhana.vercel.app` ให้กลับไปแก้ `PUBLIC_WEB_URL` และ `CORS_ORIGINS` ใน Render

### 3.4 LIFF
ใน LINE Login channel → LIFF ให้ตั้ง Endpoint URL เป็น `https://<เว็บ>/liff` แล้วใส่ LIFF ID ทั้งใน Render (`LIFF_ID`) และใน Vercel (`NEXT_PUBLIC_LIFF_ID` แล้วกด Redeploy)

### 3.5 ตั้งเวลาให้ทำงานเอง
- **เก็บประกาศทุกชั่วโมง:** ใน GitHub repo ไปที่ Settings → Secrets and variables → Actions
  - แท็บ Variables เพิ่ม `API_URL` = URL ของ Render
  - แท็บ Secrets เพิ่ม `JOBS_TOKEN` = ค่าที่ Render สุ่มให้ (ดูได้ในหน้า Environment ของ service)
  - จากนั้น workflow `collect.yml` จะเรียก `/jobs/run` ทุกชั่วโมง กด Run workflow ครั้งแรกเองได้ ครั้งแรกใช้เวลาประมาณ 5 นาที
- **กันเครื่องหลับ (แนะนำ):** สมัคร https://cron-job.org (ฟรี) แล้วสร้าง job เรียก `https://<render>/health` ทุก 10 นาที
  - service เดียวที่เปิดตลอดเดือนใช้ประมาณ 744 ชั่วโมง ยังอยู่ในโควตาฟรี 750 ชั่วโมงต่อเดือนของ Render
  - ไม่ใช้ GitHub Actions ทำงานนี้ เพราะ repo เป็น private และนาทีฟรีจะหมด

## 4. ก่อนชวนเพื่อน
- ทดสอบกับบัญชีตัวเองก่อน: แอดบอท, พิมพ์คำสั่ง, กด "เตือนฉัน", เปิดหน้าตั้งค่า และพิมพ์ "ยกเลิก"
- ดูโควตาที่ใช้ไปได้ใน OA Manager หรือที่ `/api/stats`
- **ห้าม broadcast** จาก OA Manager เพราะจะกินโควตา 300 ข้อความไปทันที
