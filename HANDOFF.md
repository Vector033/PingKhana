# PingKhana: สถานะส่งต่อ (2026-11-08)

## Live แล้ว
- เว็บ: https://pingkhana.vercel.app (Vercel project `pingkhana`, root directory `web`)
- API: https://pingkhana-api.onrender.com (Render free, Docker, Singapore, auto-deploy จาก `main`)
- DB: Neon (Singapore) · บอท LINE `@524osura` · LIFF ID `2012375267-i6ogVExo`
- GitHub Actions `collect.yml` เรียก `/jobs/run` ทุกชั่วโมง (นาทีที่ 17) และ cron-job.org เรียก `/health` ทุก 10 นาที
- รอบแรก (2026-11-07): 68 ประกาศจาก 5 เว็บ ยังเปิดรับ 11 ประกาศ ผู้ใช้ทดสอบในแชทผ่านแล้ว (ใกล้ปิดรับ, เตือนฉัน, ตั้งค่า, ยกเลิก)

## ทำใน session 2026-11-07
- ดีไซน์เว็บตาม `CLAUDE_DESIGN_GUIDE.md`
  - การ์ดขึ้นทีละใบ, ป้ายแดงสำหรับประกาศที่ปิดรับใน ≤3 วัน, drawer ดูประกาศแบบ `<dialog>`, ปุ่มเขียว "ให้ LINE เตือน"
  - ปุ่มเขียวเปิดแชทพร้อมข้อความ `เตือน <id>` และบอทรับคำสั่งนี้แล้ว
  - Playwright 14 test ผ่าน
- Gemini budget ต่อรอบ: เรียกได้ไม่เกิน 15 ครั้ง ห่างกัน 6 วินาที, แต่ละครั้งรอไม่เกิน 90 วินาที, ไม่เริ่มเรียกใหม่หลัง 4 นาที
  - ถ้าเจอ 429 หรือ timeout จะหยุดใช้ Gemini ไปทั้งรอบ ประกาศที่เหลือใช้ rules ไปก่อน แล้วรอบถัดไปค่อย upgrade เป็น Gemini
- Eval: เพิ่ม `--llm MODEL` ซึ่งเรียกผ่าน FreeLLMAPI ที่ `127.0.0.1:31415` (key `FREELLMAPI_KEY` อยู่ใน `MorPlan/.env.local`)
  - Typhoon ได้ 77.1% บนชุด dev และ 52.9% บนชุด held-out (ผลอยู่ใน README)
- pytest ผ่าน 82

## ยังเหลือ
1. ผู้ใช้ทดสอบปุ่มเขียวบนเว็บผ่านมือถือ และเช็กว่าหน้า LIFF แสดง "ประกาศที่ให้เตือน" ถูกต้องหรือไม่ (ตอนเช็กยังไม่ชัดว่าแคปหน้าจอก่อนหรือหลังพิมพ์ "ยกเลิก")
2. Vercel ยังไม่ได้ต่อ Git เพราะ Vercel GitHub app ยังไม่มีสิทธิ์เข้า repo private
   - ตอนนี้ต้อง deploy เองด้วย `npx vercel deploy --prod` จาก root ของ repo (CLI login เป็น vector033 แล้ว)
   - ถ้าจะให้ deploy อัตโนมัติ: ผู้ใช้ให้สิทธิ์ Vercel app เข้า repo แล้วกด Connect Git ใน Settings ของ project
3. Eval model อื่นยังรันไม่ได้เพราะติดข้อจำกัดของแพ็กเกจฟรี
   - gpt-oss-120b: Groq ติด 429
   - qwen3.8-27b: เจอ 413 เพราะ prompt ยาวเกิน
   - Gemini ผ่าน router: โควตาหมด
   - ให้รันใหม่ทีละ model วันอื่น หรือตัดเนื้อหาให้สั้นลง (`body[:6000]`)
4. ดูว่า Gemini upgrade ผล rules ได้จริงในรอบถัดๆ ไปหรือไม่ (ดู log ของ workflow ที่ `extracted.gemini_calls` และ `upgraded`)
5. CI บน GitHub ยังไม่เคยเช็ก (`gh` ยังไม่ได้ login) ผู้ใช้เปิดดูแท็บ Actions → CI ได้
6. ชวนเพื่อนมาใช้ แล้วใส่ตัวเลขจริง (followers, reminders) และภาพหน้าจอใน README

## ข้อควรรู้บนเครื่อง
- Postgres บนเครื่อง: Docker `pingkhana_db` port 54532 (ตอนนี้ Docker ปิดอยู่) ใช้ DB `pingkhana_e2e` สำหรับ Playwright (seed demo + เคส break-ui)
- Playwright: เปิด API ที่ :8100 ชี้ไป `pingkhana_e2e` ก่อน แล้ว `npm run build` → `npx playwright test`
- ห้ามดึง token จาก Git Credential Manager มาใช้ (ระบบบล็อก)

## กติกา
- ตอบภาษาไทย ห้าม secret ในแชท ห้าม broadcast
- ถามก่อน push หรือ deploy ทุกครั้ง (สิทธิ์ push main ใช้ได้แค่ session 2026-11-07)
