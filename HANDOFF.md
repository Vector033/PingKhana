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
**สถานะ: deploy แล้ว (`38fc199`)** (แผนอยู่ใน `MASTER_ROADMAP.md`, `PROMPT_FOR_CLAUDE.md`)

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

## Phase 2 ของ MASTER_ROADMAP (2026-11-22): รายละเอียดตามหมวด ไม่มีป้ายว่าง
**สถานะ: deploy แล้ว (`07c78c2`)**

Backend
1. **`Announcement.details` (JSONB)** migration `8c4d1e9f2a17` (ขึ้น-ลง-ขึ้นแล้ว) · เก็บเฉพาะค่าที่มี (`AnnouncementDetails.compact()`) โพสต์เก่าเป็น null
2. **`AnnouncementDetails`** ใน `extract/schema.py`: organization, target_group, event_date (YYYY-MM-DD หรือ a/b), location, work_mode (onsite/hybrid/remote), position, employment_type, education_level, experience, compensation, fee · "ไม่ระบุ", "-", "" กลายเป็น null ก่อนเก็บ
3. **Prompt Gemini**: แยก `event_date` ออกจาก `deadline` (กิจกรรมที่บอกแค่วันจัด → deadline null), ห้ามเดา, เลิกผูก prompt กับ มช. · responseSchema มี `details`
4. API ส่ง `details` ทั้งรายการและหน้าเดี่ยว · rules fallback ไม่มี details (Gemini อ่านซ้ำทีหลังได้ตามงบเดิม)

Web
1. **`AnnouncementDetails.tsx`** ใช้ทั้ง drawer และ `/a/[id]`: หัวข้อและแถวตามหมวด (ทุน/ฝึกงาน/งาน/กิจกรรม/ทั่วไป) · แถวไหนไม่มีค่าไม่แสดง ไม่มีแถวเลยไม่แสดงกล่อง · "ดูที่ประกาศต้นทาง" แทนวันปิดรับเฉพาะ ทุน/ฝึกงาน/งาน · เลิกใช้ "ไม่จำกัด / ไม่ระบุ"
2. หน้า `/a/[id]` ของข่าวทั่วไปไม่โชว์กล่อง "ตั้งเตือนไม่ได้" แล้ว (เหมือน drawer)
3. **Bottom sheet มือถือ**: ลากหัว sheet ลง > 90px เพื่อปิด (`data-sheet-handle`, pointer events, เฉพาะ touch และจอ < 768px) · แถบปุ่มล่างติดอยู่แล้วจากเดิม · bookmark ย้ายไปข้างปุ่มปิด
4. วันที่ประกาศย้ายไปอยู่ข้างชื่อแหล่งในหัว drawer (เดิมเป็นแถวในตาราง)

ตรวจแล้ว: pytest 134 (+9: details ทุกหมวด, ตัดค่า placeholder, compact เป็น null, prompt, API), ruff, eslint, tsc, build, Playwright 41 ผ่าน + 1 ข้าม (เทสต์ปัดลงรันเฉพาะ mobile) · หน้า `/a/[id]` ทุกอันไม่ล้นจอและไม่มีคำ "ไม่จำกัด/ไม่ระบุ" ที่ 360/375/768/1280

ข้อควรรู้: ประกาศที่มีอยู่แล้วบนเว็บจริงยังไม่มี `details` จนกว่าจะถูกอ่านใหม่ (ตอนนี้ระบบอ่านซ้ำเฉพาะโพสต์ใหม่/เปลี่ยน และที่ยังใช้ rules) ถ้าอยากเติมย้อนหลัง ต้องทำ backfill แยก (ยังไม่ทำ กินงบ Gemini)

## Phase 3 ของ MASTER_ROADMAP (2026-11-22): โพสต์โซเชียล + ด่านคัดกรอง 2 ชั้น
**สถานะ: deploy แล้ว (`246b779`) · Phase 1-3 ครบตาม roadmap**

Backend
1. **migration `b7e3f0a5c612`**: `Announcement.moderation_status` (published / filtered_out / pending_review, ค่าเริ่ม published), `post_intent`, `rejection_reason` · `visible()`, digest LINE, `/api/announcements/{id}`, ปุ่มเตือนใน LINE/LIFF ใช้เฉพาะ published
2. **แหล่ง `kind: social_feed`** + `platform: facebook|instagram` ใน `sources.yaml`: อ่าน RSS หรือ JSON Feed จาก bridge สาธารณะ (เช่น RSSHub) ด้วย `parse_social` · ไม่เปิดหน้า Facebook/Instagram เองเลย ใช้ caption จาก feed · ยังไม่มีแหล่งโซเชียลจริงใน yaml (ต้องเลือก bridge ก่อน)
3. **ด่าน 1** (`extract/gatekeeper.py`, ไม่ใช้ token): regex สแปม/หลอกลวง และคนหางาน (ต้องขึ้นต้นโพสต์ และไม่มีคำของฝั่งรับสมัคร) → `filtered_out` ไม่ส่ง Gemini
4. **ด่าน 2**: โพสต์ที่ผ่านด่าน 1 เก็บเป็น `pending_review` แล้วตอน Gemini สกัดข้อมูลจะถาม `post_intent`, `poster_type`, `is_publishable`, `confidence`, `rejection_reason` ในคำขอเดียวกัน (`SOCIAL_RESPONSE_SCHEMA`) · ตัดสินใน `apply()`: มั่นใจ >= 0.75 + ประกาศ/รับสมัคร → published, คนหางาน/สแปม/คุย → filtered_out, ไม่แน่ใจหรือขัดกัน → รอแอดมิน · rules fallback ตัดสินไม่ได้ จึงคงรอไว้ · แหล่งเว็บ/RSS เดิมไม่ผ่านด่านนี้
5. **API แอดมิน**: `GET /api/admin/moderation?status=pending_review|filtered_out`, `POST /api/admin/moderation/{id}/approve|reject` (อนุมัติโพสต์ที่โดนด่าน 1 จะส่งไปสกัดข้อมูลใหม่) · overview มี `pending_posts`
6. ประกาศมี `platform` (facebook/instagram) ส่งไปหน้าเว็บ

Web
1. `/admin` มีส่วน "โพสต์จากโซเชียล" แท็บ รอการตรวจสอบ / คัดออกแล้ว พร้อมเหตุผล, ประเภท, อนุมัติขึ้นเว็บ / ปฏิเสธ / กู้คืน (`ModerationQueue.tsx`)
2. ป้ายเล็ก "· Facebook / Instagram" ใน `SourceTrustPill` ของโพสต์จากโซเชียล

Eval (`eval/social_gate_cases.yaml`, 24 เคส: รับสมัครแบบทางการ 6, HR ภาษากันเอง 6, คนหางาน 6 รวมแนะนำตัวแบบ resume, สแปม 3, คุย/รีวิว 3)
- เคสเขียนเลียนโพสต์จริง ไม่ได้ดึงจาก Facebook (ต้องล็อกอิน) → ควรเก็บชุดจริงเพิ่มเมื่อมี bridge
- `python -m eval.run_social_gate_eval` (ด่าน 1 อย่างเดียว): ไม่บล็อกโพสต์รับสมัครผิดเลย, จับคนหางาน 4/6 และสแปม 3/3, ที่เหลือรอด่าน 2
- `--gemini` รอบแรก (blind): recall รับสมัคร 58% (HR ภาษากันเอง 5/6 ไปรอแอดมินเพราะ AI มั่นใจ 0.60), บล็อกถูก 100%, ไม่มีอะไรขึ้นเว็บผิด
- ปรับ prompt ("ให้ความมั่นใจตามเจตนา ไม่ใช่ความครบของรายละเอียด เพจคือผู้ประกาศ") แล้วรันซ้ำ: recall 100%, precision 100%, ไม่มีรอแอดมิน (ผลใน `eval/results/social-gate-stage1+gemini.json`) **รอบนี้ไม่ blind** เพราะปรับบนชุดเดียวกัน · หลายคำตอบมาจาก fallback `gemini-flash-lite-latest` เพราะตัวหลักติด 429

ตรวจแล้ว: pytest 150 (+16 ใน `tests/test_social_gate.py`), ruff, eslint, tsc, build, Playwright 41 + 1 ข้าม, migration ขึ้น-ลง-ขึ้น, หน้าแอดมินไม่ล้นจอที่ 375/1280

## หลัง Phase 3 (2026-11-22, deploy แล้ว)
1. **ตัวกรองใหม่** (`c84120f`): แถว 1 ขอบเขต/กลุ่ม/เลือกสถาบัน · แถว 2 ปุ่ม `# แท็ก` เปิดหน้าต่างค้นหาแท็กพร้อมจำนวนประกาศ + สถานะและการเรียงเป็น segmented switch · ถาดตัวกรองอยู่ท้าย · มือถือให้แท็กกับการเรียงอยู่บรรทัดเดียว · `OrgPicker` เปลี่ยนเป็น `SearchPicker` ใช้ทั้งสถาบันและแท็ก
2. **workflow สำรอง Collect เรียก `background=1`** (`5c0978e`): แบบรอผลโดน 502 ราวนาทีที่ 1 ตั้งแต่ 2026-11-19 (ส่งอีเมลล้มทุกรอบ)
3. **ต้นเหตุ 502 จริง** (`45a442d`): หน้า Events ของ Render มี "HTTP health check failed (timed out after 5 seconds)" เกือบทุกรอบรายชั่วโมง เพราะ `merge_duplicates` เทียบชื่อทุกคู่ (7.9 วินาทีบนเครื่อง ช้ากว่านั้นมากบน Render free) ค้าง event loop · แก้ให้ normalise ชื่อครั้งเดียว + เทียบเฉพาะชื่อที่ตัวเลขตรงกัน → 0.16 วินาที ผลเหมือนเดิม · หลัง deploy ยิง /health 30 ครั้งระหว่างรอบงาน ผ่านหมด · ถ้าเจอ 502 อีก ดูหน้า Events ของ service ใน Render ก่อน (มีงานอื่นใน job ที่กิน CPU ต้องย้ายไป thread)
4. **ข้อมูล live หลัง deploy**: orgs มช. 250 / สพฐ. 240 / ศธ. 33 (เติมหลังรอบ sync แรก) · ประกาศ 611 · ข้อมูลตามหมวด (Phase 2) มีเฉพาะโพสต์ที่ถูกอ่านใหม่
5. **กลุ่ม Facebook ใส่ไม่ได้**: robots.txt ของ facebook.com ห้ามทุกบอท และกลุ่มต้องล็อกอิน (ผู้ใช้ขอกลุ่มหางาน 2026-11-22)
6. **สำรวจแหล่งหางาน** (2026-11-22, ด้วย discovery แบบ RSS เท่านั้น):
   - ใช้ได้ (RSS + robots อนุญาต): ครูบ้านนอก `kroobannok.com/rss.xml` (ข่าวครู มีข่าวสอบครู), ธรรมศาสตร์ `tu.ac.th/feed/` (มหาวิทยาลัยแรกนอก มช.) · ยังไม่ได้ใส่ รอผู้ใช้ตัดสิน
   - ไม่ได้: JobsDB, กรมการจัดหางาน, มหิดล (robots ห้าม) · JobThai, jobbkk, smartjob, จุฬา (ไม่มี RSS) · job.ocsc.go.th (หน้าโหลดด้วย JavaScript) · กลุ่ม `career` จึงยังว่างและไม่แสดงบนเว็บ

## ผู้ใช้ต้องทำเอง
- ไม่มีค้าง (ดูสรุป session ล่าสุดใน `NEXT_SESSION.md`)

## ยังเหลือ / ไอเดียต่อ
- Eval model อื่น (gpt-oss, qwen, gemini ผ่าน router) ติดโควตาแพ็กเกจฟรี ให้ลองใหม่วันอื่น
- ชวนผู้ใช้จริง (ครูคนที่ขอ + เพื่อน) แล้วใส่ตัวเลขใน README
- ตัวดึงข้อมูลที่รันในไทย สำหรับเว็บราชการที่ปิดกั้นต่างประเทศ (moe, ksp, สพป. บางเขต)
- วัด `RadarShader` บนมือถือจริง (ตัวเลขจาก Chromium headless เป็น software GL ใช้ยืนยันไม่ได้) และตรวจ Safari/iOS
- ภาพแชท LINE ใน `docs/screenshots/line-demo/` ยังเป็นชุด 2026-11-08 (ต้องแคปจากมือถือ)
- ภาพหน้าจอใน `docs/screenshots/` ยังเป็นตัวกรองแบบเก่า (ก่อน Phase 1) ควรแคปใหม่ด้วย `web/scripts/screenshots.mjs`
- แหล่งงานสำหรับกลุ่ม `career`: ยังไม่มีเว็บที่มี RSS และ robots อนุญาต · ถ้าจะทำ ต้องเขียน HTML selector (เช็ก robots/ToS ก่อน) หรือหา bridge ที่ถูกกฎ
- เติม `details` (Phase 2) ย้อนหลังให้โพสต์เก่า: ต้องทำ backfill แยก กินงบ Gemini
- ชุด eval ของด่านโซเชียลเป็นเคสเขียนเอง ควรเก็บโพสต์จริงเมื่อมี bridge
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
