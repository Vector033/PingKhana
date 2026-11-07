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
