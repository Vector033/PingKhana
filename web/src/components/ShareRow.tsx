import type { Announcement } from "@/lib/api";
import { daysLeft } from "@/lib/format";
import { googleCalendarUrl, lineShareUrl } from "@/lib/share";

const BTN =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-medium whitespace-nowrap hover:border-brand hover:text-brand";

/** Add the closing date to a calendar, or send the post to friends in LINE. */
export function ShareRow({ a, today }: { a: Announcement; today: string }) {
  const calendar = a.deadline && daysLeft(a.deadline, today) >= 0;
  const google = calendar ? googleCalendarUrl(a) : null;
  return (
    <div className="flex flex-wrap gap-2">
      {google && (
        <>
          <a
            href={google}
            target="_blank"
            rel="noopener noreferrer"
            className={BTN}
          >
            <CalendarIcon />
            Google Calendar
          </a>
          <a href={`/a/${a.id}/ics`} className={BTN} download>
            <CalendarIcon />
            ไฟล์ปฏิทิน
          </a>
        </>
      )}
      <a
        href={lineShareUrl(a.id)}
        target="_blank"
        rel="noopener noreferrer"
        className={BTN}
      >
        <ShareIcon />
        แชร์ใน LINE
      </a>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
      <path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    >
      <path d="M10 12.5V3M6.5 6.5 10 3l3.5 3.5" />
      <path d="M5 10H4.5A1.5 1.5 0 0 0 3 11.5v4A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 15.5 10H15" />
    </svg>
  );
}
