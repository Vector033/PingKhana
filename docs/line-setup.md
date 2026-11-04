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

## 3. Deploy
- **Database:** Postgres ที่มีแพ็กเกจฟรี เช่น Neon หรือ Supabase ใส่ใน `DATABASE_URL` รูปแบบ `postgresql+asyncpg://...`
- **Backend:** ใช้ `backend/Dockerfile` ได้ทั้งบน Render, Fly.io และ Cloud Run (รัน `alembic upgrade head` ให้ตอนเริ่ม) ตั้ง env ตาม `backend/.env.example` และตั้ง `JOBS_TOKEN` เป็นค่าสุ่มยาวๆ
- **Web:** ใช้ Vercel โดยตั้ง Root Directory = `web` แล้วใส่ env ตาม `web/.env.example` ยกเว้น `NEXT_PUBLIC_DEV_LIFF` ที่ห้ามใส่ใน production
- **ตั้งเวลาให้ทำงานเอง:** ใน GitHub repo ไปที่ Settings → Secrets and variables → Actions แล้วเพิ่ม variable `API_URL` (URL ของ backend) และ secret `JOBS_TOKEN` จากนั้น workflow `collect.yml` จะเรียก `/jobs/run` ทุกชั่วโมง
- ตั้ง `PUBLIC_WEB_URL` และ `CORS_ORIGINS` ของ backend เป็น URL ของเว็บ

## 4. ก่อนชวนเพื่อน
- ทดสอบกับบัญชีตัวเองก่อน: แอดบอท, พิมพ์คำสั่ง, กด "เตือนฉัน", เปิดหน้าตั้งค่า และพิมพ์ "ยกเลิก"
- ดูโควตาที่ใช้ไปได้ใน OA Manager หรือที่ `/api/stats`
- **ห้าม broadcast** จาก OA Manager เพราะจะกินโควตา 300 ข้อความไปทันที
