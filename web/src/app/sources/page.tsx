import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getStats } from "@/lib/api";

export const metadata: Metadata = { title: "แหล่งข้อมูลและวิธีทำงาน" };

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">แหล่งข้อมูล</h1>
        <p className="mt-2 text-muted">
          PingKhana อ่านเฉพาะหน้าเว็บสาธารณะที่ไม่ต้องล็อกอิน เคารพ robots.txt
          ดึงแต่ละเว็บไม่ถี่กว่าชั่วโมงละครั้ง และระบุตัวตนด้วย User-Agent{" "}
          <code className="text-xs">PingKhanaBot/0.1</code> พร้อมลิงก์ติดต่อ
        </p>
        <Suspense
          fallback={
            <div className="mt-4 h-40 animate-pulse rounded-xl border border-line bg-surface" />
          }
        >
          <SourceTable />
        </Suspense>
      </section>

      <section>
        <h2 className="text-lg font-semibold">ทำงานอย่างไร</h2>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed">
          <li>
            <b>ดึงข้อมูล</b> — อ่านหน้ารายการประกาศของแต่ละเว็บ
            เปิดเฉพาะประกาศที่ยังไม่เคยเห็น กันซ้ำด้วย URL และ hash ของเนื้อหา
            ถ้าประกาศเดียวกันโพสต์หลายเว็บจะนับเป็นอันเดียว
          </li>
          <li>
            <b>สรุปและแยกข้อมูล</b> — สรุปภาษาไทยและอ่านประเภท วันปิดรับ (รองรับ
            พ.ศ./ค.ศ. เลขไทย และช่วงวันที่) ชั้นปี สาขา GPAX
          </li>
          <li>
            <b>แจ้งเตือนแบบประหยัด</b> — LINE OA แบบฟรีส่ง push ได้ 300
            ข้อความต่อเดือน ระบบจึงไม่ broadcast ทุกประกาศ
            ส่งเฉพาะที่ตรงกับประเภท ชั้นปี และสาขาของแต่ละคน
            รวมเป็นข้อความเดียวต่อวัน เก็บโควตาไว้ให้การเตือนกำหนดส่งก่อน
            และถ้าโควตาใกล้หมดจะส่งไปพร้อมการตอบกลับครั้งถัดไป (ซึ่งฟรี) แทน
          </li>
          <li>
            <b>ข้อมูลส่วนตัว</b> — เก็บแค่ LINE userId ชั้นปี สาขา
            และประเภทที่สนใจ พิมพ์ “ยกเลิก” ในแชทเพื่อลบทั้งหมดได้ทันที
            ประกาศรายชื่อผู้ได้รับทุน/ผู้มีสิทธิ์จะเก็บแค่หัวข้อและลิงก์
            ไม่เก็บรายชื่อ
          </li>
        </ol>
      </section>
    </div>
  );
}

async function SourceTable() {
  await connection(); // source health is live data; never bake it into the build
  let stats;
  try {
    stats = await getStats();
  } catch {
    return <p className="mt-4 text-muted">เชื่อมต่อ API ไม่ได้ในขณะนี้</p>;
  }
  const fmt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
  const ex = stats.extraction ?? {};
  const gemini = ex.gemini ?? 0;
  const rules = (ex.rules ?? 0) + (ex["rules:gemini-error"] ?? 0);
  return (
    <>
      {gemini + rules > 0 && (
        <p className="mt-4 text-sm text-muted">
          อ่านด้วย Gemini แล้ว{" "}
          <span className="font-semibold text-fg tabular-nums">{gemini}</span>{" "}
          ประกาศ · ใช้กฎสำรอง{" "}
          <span className="font-semibold text-fg tabular-nums">{rules}</span>{" "}
          ประกาศ (รอบถัดไปจะค่อยๆ อ่านซ้ำด้วย Gemini)
        </p>
      )}
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">เว็บ</th>
              <th className="px-4 py-2 font-medium">กลุ่ม</th>
              <th className="px-4 py-2 font-medium">ดึงสำเร็จล่าสุด</th>
              <th className="px-4 py-2 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {stats.sources.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">
                  <a
                    href={s.url}
                    className="hover:text-brand hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.name}
                  </a>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-muted">
                  {s.pack ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted">
                  {s.last_success_at
                    ? fmt.format(new Date(s.last_success_at))
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  {s.healthy ? (
                    <span className="text-brand">ปกติ</span>
                  ) : (
                    <span
                      className="text-danger"
                      title={s.last_error ?? undefined}
                    >
                      ดึงไม่สำเร็จ (เว็บอาจเปลี่ยนหน้าตา)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
