import Link from "next/link";
import type { MouseEvent } from "react";
import type { Announcement } from "@/lib/api";
import { CATEGORY_STYLE, daysLeft, daysLeftLabel, thDate } from "@/lib/format";

export function CategoryChip({
  category,
  label,
}: {
  category: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_STYLE[category] ?? CATEGORY_STYLE.general}`}
    >
      {label}
    </span>
  );
}

/** Closing within 3 days (today counts). */
export function isUrgent(deadline: string | null, today: string): boolean {
  if (!deadline) return false;
  const n = daysLeft(deadline, today);
  return n >= 0 && n <= 3;
}

export function DeadlineBadge({
  deadline,
  today,
}: {
  deadline: string;
  today: string;
}) {
  const n = daysLeft(deadline, today);
  if (n >= 0 && n <= 3) {
    return (
      <span className="animate-urgency inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-sm font-semibold text-danger">
        <ClockIcon />
        {daysLeftLabel(n)}
        <span className="font-normal">· {thDate(deadline)}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${n < 0 ? "text-muted line-through decoration-1" : "font-medium text-fg"}`}
    >
      <ClockIcon />
      ปิดรับ {thDate(deadline)}
      {n >= 0 && (
        <span className="font-normal text-muted">· {daysLeftLabel(n)}</span>
      )}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.25 1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AnnouncementCard({
  a,
  today,
  index = 0,
  onOpen,
}: {
  a: Announcement;
  today: string;
  index?: number;
  onOpen?: (a: Announcement) => void;
}) {
  function open(e: MouseEvent<HTMLAnchorElement>) {
    // Let new-tab / new-window clicks through to the full page.
    if (
      !onOpen ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    )
      return;
    e.preventDefault();
    onOpen(a);
  }
  const urgent = isUrgent(a.deadline, today);

  return (
    <article
      style={{ "--i": index } as React.CSSProperties}
      className={`animate-card-enter group relative rounded-xl border bg-surface p-4 transition-[transform,box-shadow,border-color] duration-200 hover:shadow-card hover:ring-4 hover:ring-[var(--brand-ring)] motion-safe:hover:-translate-y-1 sm:p-5 ${
        urgent ? "border-danger/40" : "border-line hover:border-brand/60"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <CategoryChip category={a.category} label={a.category_th} />
        <span className="min-w-0 break-words">{a.source_name}</span>
        {a.published_on && (
          <span>
            <span aria-hidden>· </span>
            {thDate(a.published_on)}
          </span>
        )}
      </div>
      <h2 className="mt-2 text-base leading-snug font-semibold [overflow-wrap:anywhere] sm:text-[1.0625rem]">
        <Link
          href={`/a/${a.id}`}
          onClick={open}
          className="outline-none after:absolute after:inset-0 after:rounded-xl group-hover:text-brand focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
        >
          {a.title}
        </Link>
      </h2>
      {a.summary_th && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted [overflow-wrap:anywhere]">
          {a.summary_th}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        {a.deadline ? (
          <DeadlineBadge deadline={a.deadline} today={today} />
        ) : (
          <span>ไม่ระบุวันปิดรับ</span>
        )}
        {a.eligible_years && <span>ชั้นปี {a.eligible_years.join(", ")}</span>}
        {a.min_gpax != null && <span>GPAX ≥ {a.min_gpax.toFixed(2)}</span>}
      </div>
    </article>
  );
}
