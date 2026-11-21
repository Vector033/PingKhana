import { DeadlineBadge } from "@/components/AnnouncementCard";
import type { Announcement } from "@/lib/api";
import { thDate } from "@/lib/format";

// Categories people apply to: a missing deadline is worth saying (check the source).
const ACTIONABLE = new Set(["scholarship", "internship", "job"]);

const WORK_MODE: Record<string, string> = {
  onsite: "ทำที่สถานที่",
  hybrid: "ไฮบริด",
  remote: "ทำงานทางไกล",
};

/** "2026-12-09" -> "9 ธ.ค. 69", "2026-12-09/2026-12-11" -> "9 ธ.ค. 69 – 11 ธ.ค. 69"; other text as is. */
function eventText(v: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const parts = v.split("/");
  return parts.every((p) => iso.test(p)) ? parts.map(thDate).join(" – ") : v;
}

type Row = [label: string, value: React.ReactNode, numeric?: boolean];

/**
 * The facts that matter for this kind of post (a job's salary, an activity's date), under a
 * heading that fits it. Rows without a value are left out, and with no rows nothing renders.
 */
export function AnnouncementDetails({
  a,
  today,
  majors,
  variant,
}: {
  a: Announcement;
  today: string;
  majors: Record<string, string>;
  variant: "drawer" | "page";
}) {
  const d = a.details ?? {};
  const deadline = a.deadline ? (
    <>
      <DeadlineBadge deadline={a.deadline} today={today} />
      {a.deadline_text && (
        <div className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">
          ต้นฉบับ: “{a.deadline_text}”
        </div>
      )}
    </>
  ) : ACTIONABLE.has(a.category) ? (
    <span className="text-muted">ดูที่ประกาศต้นทาง</span>
  ) : null;
  const years = a.eligible_years?.length
    ? a.eligible_years.map((y) => `ปี ${y}`).join(", ")
    : null;
  const majorNames = a.eligible_majors?.length
    ? a.eligible_majors.map((m) => majors[m] ?? m).join(", ")
    : null;
  const gpax = a.min_gpax != null ? a.min_gpax.toFixed(2) : null;
  const place =
    [d.work_mode && WORK_MODE[d.work_mode], d.location]
      .filter(Boolean)
      .join(" · ") || null;
  const event = d.event_date ? eventText(d.event_date) : null;

  const spec: Record<string, [string, Row[]]> = {
    scholarship: [
      "คุณสมบัติและกำหนดการรับสมัคร",
      [
        ["วันปิดรับ", deadline],
        ["กลุ่มเป้าหมาย", d.target_group],
        ["มูลค่าทุน", d.compensation, true],
        ["ชั้นปี", years, true],
        ["สาขา", majorNames],
        ["GPAX ขั้นต่ำ", gpax, true],
      ],
    ],
    internship: [
      "รายละเอียดและกำหนดการฝึกงาน",
      [
        ["วันปิดรับ", deadline],
        ["องค์กร / บริษัท", d.organization],
        ["รูปแบบ / สถานที่", place],
        ["เบี้ยเลี้ยง", d.compensation, true],
        ["ชั้นปี", years, true],
        ["สาขา", majorNames],
        ["GPAX ขั้นต่ำ", gpax, true],
      ],
    ],
    job: [
      "รายละเอียดตำแหน่งและคุณสมบัติ",
      [
        ["วันปิดรับ", deadline],
        ["หน่วยงาน", d.organization],
        ["ตำแหน่ง", d.position],
        ["ประเภทการจ้าง", d.employment_type],
        ["วุฒิการศึกษา", d.education_level],
        ["ประสบการณ์", d.experience],
        ["เงินเดือน", d.compensation, true],
        ["สถานที่", place],
      ],
    ],
    activity: [
      "กำหนดการและรายละเอียดกิจกรรม",
      [
        ["วันจัดกิจกรรม", event, true],
        ["ปิดรับลงทะเบียน", deadline],
        ["สถานที่", place],
        ["กลุ่มเป้าหมาย", d.target_group],
        ["ค่าใช้จ่าย", d.fee],
      ],
    ],
    general: [
      "กำหนดการและข้อมูลสำคัญ",
      [
        ["กำหนดการ", event, true],
        ["วันปิดรับ", deadline],
        ["หน่วยงาน", d.organization],
        ["กลุ่มเป้าหมาย", d.target_group],
        ["สถานที่", place],
      ],
    ],
  };
  const [title, all] = spec[a.category] ?? spec.general;
  const rows = all.filter(([, v]) => v != null && v !== "");
  if (rows.length === 0) return null;

  return (
    <section>
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      {variant === "page" ? (
        <dl className="mt-2 grid gap-x-6 gap-y-4 rounded-xl border border-line bg-surface p-5 text-sm [overflow-wrap:anywhere] sm:grid-cols-2">
          {rows.map(([label, value, numeric]) => (
            <div key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className={`mt-0.5 ${numeric ? "tabular-nums" : ""}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <dl className="mt-1.5 divide-y divide-line text-sm">
          {rows.map(([label, value, numeric]) => (
            <div
              key={label}
              className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2.5"
            >
              <dt className="text-muted">{label}</dt>
              <dd
                className={`[overflow-wrap:anywhere] ${numeric ? "tabular-nums" : ""}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
