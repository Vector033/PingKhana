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

/** Opens LINE with "เตือน <id>" ready to send; the bot then reminds 3 days and 1 day before. */
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`bell-trigger inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-line-green px-5 font-semibold text-line-green-fg shadow-sm transition hover:brightness-105 active:scale-[0.98] ${className}`}
    >
      <BellIcon />
      ให้ LINE เตือนก่อนปิดรับ
    </a>
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
  if (n === 0)
    return "ปิดรับวันนี้ เตือนล่วงหน้าไม่ทันแล้ว ถ้าสนใจให้สมัครที่ประกาศต้นทางเลย";
  return null;
}

/** The LINE button, or a one-line reason in its place. */
export function RemindSlot({
  id,
  deadline,
  today,
  className = "",
}: {
  id: number;
  deadline: string | null;
  today: string;
  className?: string;
}) {
  const reason = remindBlockedReason(deadline, today);
  if (reason) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">
        <BellIcon className="mt-0.5 size-4 opacity-70" />
        {reason}
      </p>
    );
  }
  return <RemindButton id={id} className={className} />;
}
