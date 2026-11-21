# PingKhana: สถานะส่งต่อ (2026-11-22)

## Live
- เว็บ: https://pingkhana.vercel.app (Vercel, deploy เองเมื่อ push main) · API: https://pingkhana-api.onrender.com (Render, auto-deploy, migration รันตอนเริ่ม)
- DB: Neon · บอท LINE `@524osura` · LIFF `2012375267-i6ogVExo`
- ตั้งเวลา: cron-job.org เรียก `POST /jobs/run?background=1` ทุกชั่วโมง และ `/health` ทุก 10 นาที ส่วน GitHub `collect.yml` เป็นตัวสำรอง (GitHub รันจริงประมาณทุก 5 ชั่วโมง)
- CI ผ่าน (pytest + Playwright) · `gh` login ไว้แล้ว (Vector033)

## ทำแล้ว (2026-11-08 ถึง 09)
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
8. **Google login (ไม่บังคับ):** ติดตามได้ข้ามเครื่อง และผูกกับ LINE ด้วยการพิมพ์ "ผูก 123456"
   - เปิดใช้แล้ว (ผู้ใช้ตั้งค่า OAuth Client ID ใน Render + Vercel แล้ว ทดสอบผูก LINE ผ่าน)
9. **LINE OA + ภาพ portfolio:** รูปโปรไฟล์/ปกใน `docs/brand/`, ภาพแชทบอทครอปแล้วใน `docs/screenshots/line-demo/`
10. **ประกาศเก่าไม่มีวันปิดรับ** ไม่นับว่ายังเปิดอยู่ (`recent_if_undated` ใน `queries.py`)

## ทำแล้ว (2026-11-10 ถึง 13): ปรับดีไซน์หน้าเว็บ
ข้อกำหนดดีไซน์อยู่ที่ `CLAUDE_DESIGN_GUIDE.md` (token, กฎ anti-AI-slop 20 ข้อ, กติกาพื้นหลังและ shader) ต้องอ่านก่อนแก้ UI
1. **Gemini redesign** (`45115d0`–`5e4a4fc`): ธีม "Live Intelligence Radar", fluted glass ที่ header, thermal gradient บนการ์ดใกล้ปิด, `RadarShader` (WebGL เขียนเอง ไม่มี dependency) ใน hero, ป้ายบนโปสเตอร์มีพื้นทึบ, ไทม์ไลน์ 3 ขั้นใต้ปุ่ม LINE
2. **แก้ล้นจอมือถือ** (`4f91754`, `9ee0762`): grid ใช้ `grid-cols-1` / `minmax(0,…)`, ตัวกรองเลื่อนข้าง, วันที่ไม่แตกบรรทัด, header มือถือ 2 แถว
3. **ขัดตามคู่มือ** (`4f93204`, `bad7248`):
   - ถอดแถบ `[::.:] SCAN 1H` (ของประดับที่ทำทีเป็นข้อมูล), noise feTurbulence และเส้นโค้งใน hero · hero เหลือ teal tint + shader + จุด + วงเรดาร์
   - shader วาด 1 px ต่อ CSS px และราว 30fps · หยุดเมื่อ reduced-motion หรือเลื่อนพ้นจอ · ผู้ใช้เลือกเก็บ shader ไว้
   - โปสเตอร์ใช้ `loading="eager"` + `fetchPriority="high"` (Next 16 เลิกใช้ `priority`) แก้คำเตือน LCP
   - หน้า `/a/[id]` มือถือ: แถบปุ่ม LINE ติดล่างจอเฉพาะเมื่อตั้งเตือนได้
   - แท็กสูง 44px, skeleton เป็นรูปการ์ด, เส้นไอคอนราว 1.5px, `tabular-nums`
   - ไอคอนเป็น inline SVG แบบ Lucide (ไม่ลง `lucide-react`) · สี chip หมวดยังเป็นสี Tailwind ตรงๆ (ตั้งใจ)
4. **ภาพหน้าจอใหม่** (`d6e4fdc`): `docs/screenshots/` จากเว็บ live · สคริปต์เลือกประกาศที่ยังตั้งเตือนได้ ภาพ drawer จึงมีปุ่ม LINE

## ทำแล้ว (2026-11-14): แหล่งข้อมูลเพิ่ม + แจ้งเตือนแหล่งพัง
1. **เพิ่ม 4 คณะ มช. แบบ RSS**: `eng_cmu`, `camt_cmu`, `law_cmu`, `finearts_cmu` (ผลสำรวจและเว็บที่ไม่เอาอยู่ใน `docs/sources.md` หัวข้อ Second survey)
2. **ตัดประกาศจัดซื้อจัดจ้างทุกแหล่ง** ด้วยหัวข้อ (`PROCUREMENT` ใน `pipeline.py`) · ห้ามใส่คำว่า "จัดจ้าง" เดี่ยวๆ เพราะประกาศรับสมัครงานใช้คำนี้
3. **หา RSS จากชื่อเว็บ**: ใส่แค่ `eng.cmu.ac.th` ก็เจอ feed · แก้ให้ลอง `www.` เมื่อชื่อเว็บไม่มี DNS (เช่น econ.cmu.ac.th) · ใส่ชื่อหน่วยงาน (ไม่ใช่โดเมน) ยังหาไม่ได้
4. **Source health** (`.github/workflows/source-health.yml` + `backend/scripts/source_health.py`): ทุก 3 ชม. ถ้าแหล่งไหนไม่ได้ดึงสำเร็จเกิน 6 ชม. หรือล้มเหลว 3 รอบติด workflow จะล้ม แล้ว GitHub ส่งอีเมลหาเจ้าของ repo
5. **เอาตัวกรองชั้นปีออกจากหน้าเว็บ**: ประกาศที่เปิดอยู่ระบุชั้นปีแค่ 1/49 และชุดครูไม่มีชั้นปี · หน้าตั้งค่า LINE ยังใช้ชั้นปีคัดสิ่งที่ส่ง

## Phase 1 ของ MASTER_ROADMAP (2026-11-22): ตัวกรองแหล่งแบบกลาง + เลือกสถาบัน
**สถานะ: ทำเสร็จและผ่านเทสต์ ยังไม่ commit / push รอผู้ใช้รีวิวก่อนเริ่ม Phase 2** (แผนอยู่ใน `MASTER_ROADMAP.md`, `PROMPT_FOR_CLAUDE.md`)

Backend
1. **`Source.org` + `Source.platform`** (migration `5b2e7c41a9d0`, ขึ้น-ลง-ขึ้นทดสอบแล้ว) · `org` กำหนดใน `sources.yaml` (มช. 9 แหล่ง, ศธ., สพฐ., คุรุสภา; เว็บอิสระอย่างครูอาชีพไม่มี org) · `sync_sources` เขียนให้ทุกรอบ ส่วน `platform` = `rss`/`web` ตาม kind (เตรียมไว้ให้ Phase 3)
2. **ชื่อกลุ่มเป็นกลาง** `PACKS`: มหาวิทยาลัย / ครู / การศึกษา / งาน / อาชีพ (ใหม่: `career`) / ทั่วไป · key เดิมไม่เปลี่ยน ผู้ใช้ LINE ที่ตั้งค่าไว้แล้วใช้ต่อได้ · กลุ่มที่ยังไม่มีแหล่งไม่แสดงบนเว็บ (ตอนนี้ `career` ยังว่าง)
3. **API**: `/api/announcements?org=` · `/api/meta` เพิ่ม `orgs` [{id, name, count}] (id = ชื่อ, เรียงตามจำนวนประกาศ) และ `org`/`platform` ในแต่ละ source
4. **แหล่งที่ผู้ใช้เพิ่ม**: `/api/sources/discover` เดา `org` จากแหล่งเดิมที่อยู่โดเมนเดียวกัน (`site_key`: eng.cmu.ac.th → cmu.ac.th → มช.) · ฟอร์มมีช่อง "มหาวิทยาลัย / หน่วยงาน" · แอดมินแก้ org ได้ผ่าน API (`Decision.org`; หน้าแอดมินแสดงแต่ยังไม่มีช่องแก้)

Web
1. **ตัวกรอง 3 ชั้น** (`Listing.tsx`): (1) ที่ติดตาม / ทั้งหมด / กลุ่ม / ปุ่ม "เลือกสถาบัน / แหล่ง" ขึ้นบรรทัดใหม่บนมือถือ (2) ถาดตัวกรองที่ใช้อยู่ ลบทีละตัวหรือ "ล้างตัวกรองทั้งหมด" (3) แท็ก (บรรทัดเดียวเลื่อนข้าง) + สถานะ + เรียงตาม
2. **`OrgPicker.tsx`**: `<dialog>` แบบ command palette ค้นหาสถาบันและแหล่งข่าวทันที แสดงจำนวนประกาศ, Enter เลือกตัวแรก, ลิงก์ไป `/sources/new`
3. **`FollowButton.tsx`**: bookmark บนการ์ด, การ์ดใหญ่, drawer และหน้า `/a/[id]` · server action `toggleFollow` เขียน cookie `pk_follow` · toast ผ่าน portal (การ์ดมี transform/overflow)
4. **หน้าแนะนำ "ที่ติดตาม"** (`?following=1` เมื่อยังไม่ติดตามอะไร): ปุ่มติดตามสถาบันที่มีประกาศมากสุด 3 อัน (`followOrg`) + ปุ่มค้นหา + ลิงก์ `/follow`
5. metadata ของเว็บเลิกผูกกับ มช.

ตรวจแล้ว: pytest 125 (เพิ่มเทสต์ org/meta/site_key/การเดา org/แหล่งใน yaml และแก้เทสต์ที่ผูกวันที่ `test_list_filters_and_search` ซึ่งล้มตั้งแต่ ~15 พ.ย.), ruff, eslint, tsc, build, Playwright 38/38 (+3 เทสต์: เลือกสถาบัน+ถาด, หน้าแนะนำ, bookmark), ไม่ล้นจอทุก route ที่ 360/375/768/1280 · LIFF prefs ใช้ key เดิม (เทสต์ `test_prefs_packs_roundtrip_and_validation` ผ่าน)

ข้อควรรู้หลัง deploy: `org` ของแหล่ง yaml จะเติมในรอบดึงข้อมูลรายชั่วโมงแรก (ก่อนหน้านั้นช่องเลือกสถาบันมีแต่รายชื่อแหล่ง)

## ผู้ใช้ต้องทำเอง
- ไม่มีค้าง (ดูสรุป session ล่าสุดใน `NEXT_SESSION.md`)

## ยังเหลือ / ไอเดียต่อ
- Eval model อื่น (gpt-oss, qwen, gemini ผ่าน router) ติดโควตาแพ็กเกจฟรี ให้ลองใหม่วันอื่น
- ชวนผู้ใช้จริง (ครูคนที่ขอ + เพื่อน) แล้วใส่ตัวเลขใน README
- ตัวดึงข้อมูลที่รันในไทย สำหรับเว็บราชการที่ปิดกั้นต่างประเทศ (moe, ksp, สพป. บางเขต)
- วัด `RadarShader` บนมือถือจริง (ตัวเลขจาก Chromium headless เป็น software GL ใช้ยืนยันไม่ได้) และตรวจ Safari/iOS
- ภาพแชท LINE ใน `docs/screenshots/line-demo/` ยังเป็นชุด 2026-11-08 (ต้องแคปจากมือถือ)
- คณะที่ไม่มี RSS (econ, pharmacy, nurse, ams, vet, edu, soc, agro, dent, med) ต้องเขียน HTML selector เอง
- 8 ไฟล์ที่ Gemini เขียนยังไม่ผ่าน Prettier (`account/*`, `follow`, `liff/*`, `news`, `sources/*`) CI ไม่ตรวจ ให้ format เมื่อแก้ไฟล์นั้น

## ข้อควรรู้บนเครื่อง
- Docker Desktop อยู่ที่ `%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe` (ต้องเปิดก่อน `docker start`)
- Postgres: Docker `pingkhana_db` port 54532 (มี DB `pingkhana`, `pingkhana_test`, `pingkhana_e2e`)
- Playwright:
  1. `cd backend` → `alembic upgrade head` + `python -m scripts.seed_demo` (ใช้ DATABASE_URL ของ `pingkhana_e2e`)
  2. เปิด API ที่ :8100 พร้อม `CORS_ORIGINS=http://localhost:3005` และ `JOBS_TOKEN=`
  3. `cd web && npm run build && npx playwright test`
- ภาพหน้าจอ: `cd web && BASE_URL=https://pingkhana.vercel.app node scripts/screenshots.mjs`
- ดูหน้าเว็บกับข้อมูลจริง: launch config `pingkhana-web-liveapi` (port 3007, ใน `Desktop\.claude\launch.json`) · CORS error ใน console จาก localhost เป็นเรื่องปกติ
- ตรวจหน้าเว็บ: Browser pane ในแอปมักซ่อนอยู่ ทำให้ React streaming ไม่แสดงเนื้อหา และ Playwright MCP อาจติด "Browser is already in use" → เขียนสคริปต์ Node ใช้ `node_modules/playwright` ของ `web/` เอง (`chromium.launch()`, ตั้ง `colorScheme` / `reducedMotion` ต่อ context)
- เช็กก่อน push: `cd web && npx eslint . && npx next typegen && npx tsc --noEmit && npm run build` แล้ว Playwright 32/32 · ทุก route ที่ 360/375/768/1280 ต้อง `scrollWidth == clientWidth`
- ห้ามดึง token จาก Git Credential Manager (ระบบบล็อก) ตอนนี้ใช้ `gh` แทน

## กติกา
ตอบภาษาไทย · ห้าม secret ในแชท · ห้าม broadcast · ถามก่อน push/deploy ยกเว้นผู้ใช้อนุญาตใน session นั้น (2026-11-09 ผู้ใช้ให้ทำต่อเองได้)
