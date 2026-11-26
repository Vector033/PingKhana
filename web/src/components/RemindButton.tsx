import { RemindTrigger } from "@/components/RemindModal";
import { daysLeft } from "@/lib/format";
import { remindHref } from "@/lib/line";

export function BellIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`bell shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/** Opens LINE with "เตือน <id>" ready to send (or QR modal on desktop); reminds 3d and 1d before. */
export function RemindButton({
  id,
  className = "",
}: {
  id: number;
  className?: string;
}) {
  const href = remindHref(id);
  if (!href) return null;
  return (
    <RemindTrigger
      id={id}
      href={href}
      className={className}
      icon={<BellIcon />}
      timeline={<RemindSafetyTimeline />}
    />
  );
}

/** Why a reminder cannot be set, or null when it can (reminders go out 3 days and 1 day before). */
export function remindBlockedReason(
  deadline: string | null,
  today: string,
): string | null {
  if (!deadline)
    return "ประกาศนี้ไม่ระบุวันปิดรับ จึงตั้งเตือนไม่ได้ ดูรายละเอียดที่ประกาศต้นทาง";
  const n = daysLeft(deadline, today);
  if (n < 0) return "ประกาศนี้ปิดรับไปแล้ว";
  if (n === 0) return "ปิดรับวันนี้ เตือนล่วงหน้าไม่ทันแล้ว ถ้าสนใจให้สมัครที่ประกาศต้นทางเลย";
  return null;
}

/** Transparent 3-step safety net so students know exactly when LINE pings. */
export function RemindSafetyTimeline({
  className = "",
}: {
  className?: string;
}) {
  return (
    <p
      className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug text-pretty text-muted ${className}`}
    >
      <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-fg/85">
        <span aria-hidden className="size-1.5 rounded-full bg-line-green" />
        กดเตือน
      </span>
      <span aria-hidden className="text-muted/70">
        →
      </span>
      <span className="whitespace-nowrap">เตือนก่อนปิด 3 วัน</span>
      <span aria-hidden className="text-muted/70">
        →
      </span>
      <span className="whitespace-nowrap">เตือนซ้ำก่อนปิด 1 วัน</span>
      <span className="whitespace-nowrap">· ยกเลิกได้ตลอด</span>
    </p>
  );
}

/** The LINE button + transparent 3-step safety timeline, or a one-line reason in its place. */
export function RemindSlot({
  id,
  deadline,
  today,
  className = "",
  showTimeline = true,
}: {
  id: number;
  deadline: string | null;
  today: string;
  className?: string;
  showTimeline?: boolean;
}) {
  const reason = remindBlockedReason(deadline, today);
  if (reason) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-pretty text-muted">
        <BellIcon className="mt-0.5 size-4 opacity-70" />
        {reason}
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      <RemindButton id={id} className={className} />
      {showTimeline && <RemindSafetyTimeline />}
    </div>
  );
}
