import type { Announcement } from "@/lib/api";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pingkhana.vercel.app"
).replace(/\/$/, "");

export const pageUrl = (id: number) => `${SITE_URL}/a/${id}`;

/** LINE's official share link: opens the share sheet to friends, groups or the timeline. */
export const lineShareUrl = (id: number) =>
  `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(pageUrl(id))}`;

const ymd = (iso: string) => iso.slice(0, 10).replaceAll("-", "");

function nextDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Google Calendar "add event" link: an all-day event on the closing date. */
export function googleCalendarUrl(a: Announcement): string | null {
  if (!a.deadline) return null;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `ปิดรับ: ${a.title}`.slice(0, 200),
    dates: `${ymd(a.deadline)}/${ymd(nextDay(a.deadline))}`,
    details: `${a.url}\n\nจาก PingKhana (${pageUrl(a.id)}) — ไม่ใช่ช่องทางทางการ ตรวจรายละเอียดที่ประกาศต้นทาง`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 lines are folded at 75 octets; UTF-8 Thai is 3 bytes per character. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > 73) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
}

/** One all-day event on the closing date with alarms 3 days and 1 day before. */
export function icsFor(a: Announcement, now = new Date()): string {
  if (!a.deadline) throw new Error("no deadline");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PingKhana//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:pingkhana-${a.id}@pingkhana.vercel.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(a.deadline)}`,
    `DTEND;VALUE=DATE:${ymd(nextDay(a.deadline))}`,
    `SUMMARY:${icsEscape(`ปิดรับ: ${a.title}`)}`,
    `DESCRIPTION:${icsEscape(`${a.url}\n\nจาก PingKhana — ไม่ใช่ช่องทางทางการ ตรวจรายละเอียดที่ประกาศต้นทาง`)}`,
    `URL:${a.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:อีก 3 วันปิดรับ",
    "TRIGGER:-P3D",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:พรุ่งนี้ปิดรับ",
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
