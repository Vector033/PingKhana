const TH_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/** "2026-10-20" -> "20 ต.ค. 69" (Buddhist-era year, as Thai students read dates). */
export function thDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${String((y + 543) % 100).padStart(2, "0")}`;
}

/** Today in Bangkok as YYYY-MM-DD. */
export function todayBangkok(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    now,
  );
}

export function daysLeft(deadline: string, today: string): number {
  return Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000);
}

export function daysLeftLabel(n: number): string {
  if (n < 0) return "ปิดรับแล้ว";
  if (n === 0) return "ปิดรับวันนี้";
  if (n === 1) return "ปิดพรุ่งนี้";
  return `เหลือ ${n} วัน`;
}

export const CATEGORY_STYLE: Record<string, string> = {
  scholarship:
    "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-200",
  internship:
    "bg-blue-50 text-blue-800 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-200",
  job: "bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-200",
  activity:
    "bg-orange-50 text-orange-800 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-200",
  general:
    "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-200",
};

export const DISCLAIMER =
  "PingKhana ไม่ใช่ช่องทางทางการของคณะหรือมหาวิทยาลัย ข้อมูลอ่านจากเว็บอัตโนมัติ โปรดตรวจสอบรายละเอียดที่ประกาศต้นทางทุกครั้ง";

/** Whole minutes since an ISO timestamp (server render, per request). */
export function minutesSince(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
}

/** Background for a card without a poster: the category's colour, so the grid stays readable. */
export const CATEGORY_TINT: Record<string, string> = {
  scholarship:
    "from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-300",
  internship:
    "from-blue-100 to-blue-200 text-blue-700 dark:from-blue-950 dark:to-blue-900 dark:text-blue-300",
  job: "from-violet-100 to-violet-200 text-violet-700 dark:from-violet-950 dark:to-violet-900 dark:text-violet-300",
  activity:
    "from-orange-100 to-orange-200 text-orange-700 dark:from-orange-950 dark:to-orange-900 dark:text-orange-300",
  general:
    "from-slate-100 to-slate-200 text-slate-600 dark:from-slate-900 dark:to-slate-800 dark:text-slate-300",
};
