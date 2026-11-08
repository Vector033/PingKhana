import Link from "next/link";
import type { MouseEvent } from "react";
import { Highlight, Thumb } from "@/components/Thumb";
import type { Announcement } from "@/lib/api";
import { CATEGORY_STYLE, daysLeft, daysLeftLabel, thDate } from "@/lib/format";

export function CategoryChip({
  category,
  label,
  className = "",
}: {
  category: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_STYLE[category] ?? CATEGORY_STYLE.general} ${className}`}
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
  onImage = false,
}: {
  deadline: string;
  today: string;
  /** White text for use over a dark photo gradient. */
  onImage?: boolean;
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
  if (n < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted line-through decoration-1">
        <ClockIcon />
        ปิดรับ {thDate(deadline)}
      </span>
    );
  }
  if (onImage) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-sm text-white backdrop-blur-sm">
        <ClockIcon />
        <span className="font-semibold">ปิดรับ {thDate(deadline)}</span>
        <span className="text-white/80">· {daysLeftLabel(n)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <ClockIcon />
      {/* Marker-pen highlight: the one thing to remember from the card. */}
      <span className="marker font-semibold text-fg">
        ปิดรับ {thDate(deadline)}
      </span>
      <span className="text-muted">· {daysLeftLabel(n)}</span>
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

type CardProps = {
  a: Announcement;
  today: string;
  index?: number;
  q?: string;
  onOpen?: (a: Announcement) => void;
};

/** Plain click opens the quick preview; new-tab / new-window clicks go to the full page. */
function opener(a: Announcement, onOpen?: (a: Announcement) => void) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
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
  };
}

// The title link stretches over the whole card (::after), so the card is one click target.
const STRETCH =
  "outline-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand";

function Meta({ a }: { a: Announcement }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
      <span className="min-w-0 break-words">{a.source_name}</span>
      {a.published_on && (
        <span>
          <span aria-hidden>· </span>
          {thDate(a.published_on)}
        </span>
      )}
    </div>
  );
}

/** Grid card: poster on top, then source, title, summary and the deadline. */
export function AnnouncementCard({
  a,
  today,
  index = 0,
  q,
  onOpen,
}: CardProps) {
  const urgent = isUrgent(a.deadline, today);
  return (
    <article
      style={{ "--i": index } as React.CSSProperties}
      className={`animate-card-enter group relative flex flex-col overflow-hidden rounded-2xl border bg-surface transition-[transform,box-shadow,border-color] duration-200 hover:shadow-card hover:ring-4 hover:ring-[var(--brand-ring)] motion-safe:hover:-translate-y-1 ${
        urgent ? "border-danger/40" : "border-line hover:border-brand/60"
      }`}
    >
      <div className="relative">
        <Thumb
          src={a.image_url}
          category={a.category}
          label={a.category_th}
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="aspect-[16/9]"
        />
        <CategoryChip
          category={a.category}
          label={a.category_th}
          className="absolute top-3 left-3 shadow-sm"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Meta a={a} />
        <h3 className="mt-1.5 line-clamp-3 text-base leading-snug font-semibold [overflow-wrap:anywhere] group-hover:text-brand">
          <Link
            href={`/a/${a.id}`}
            onClick={opener(a, onOpen)}
            className={STRETCH}
          >
            <Highlight text={a.title} q={q} />
          </Link>
        </h3>
        {a.summary_th && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted [overflow-wrap:anywhere]">
            <Highlight text={a.summary_th} q={q} />
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 text-xs text-muted">
          {a.deadline ? (
            <DeadlineBadge deadline={a.deadline} today={today} />
          ) : a.category === "general" ? null : (
            <span>ไม่ระบุวันปิดรับ</span>
          )}
          {a.eligible_years && (
            <span>ชั้นปี {a.eligible_years.join(", ")}</span>
          )}
          {a.min_gpax != null && <span>GPAX ≥ {a.min_gpax.toFixed(2)}</span>}
          {a.tags?.slice(0, 2).map((t) => (
            <span key={t} className="text-muted">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

/** Front-page lead: a large poster, then a big title. Posters are mostly text, so no text on top. */
export function LeadCard({ a, today, onOpen }: CardProps) {
  return (
    <article className="animate-card-enter group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-[box-shadow,border-color] duration-200 hover:border-brand/60 hover:ring-4 hover:ring-[var(--brand-ring)]">
      <div className="relative">
        <Thumb
          src={a.image_url}
          category={a.category}
          label={a.category_th}
          sizes="(min-width: 1024px) 680px, 100vw"
          priority
          className="aspect-[16/9]"
        />
        {a.deadline && (
          <div className="absolute top-3 right-3">
            <DeadlineBadge deadline={a.deadline} today={today} onImage />
          </div>
        )}
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <CategoryChip category={a.category} label={a.category_th} />
          <span>{a.source_name}</span>
        </div>
        <h3 className="mt-2 line-clamp-3 text-xl leading-snug font-semibold text-balance [overflow-wrap:anywhere] group-hover:text-brand sm:text-2xl">
          <Link
            href={`/a/${a.id}`}
            onClick={opener(a, onOpen)}
            className={STRETCH}
          >
            {a.title}
          </Link>
        </h3>
        {a.summary_th && (
          <p className="mt-2 line-clamp-2 max-w-2xl text-muted">
            {a.summary_th}
          </p>
        )}
      </div>
    </article>
  );
}

/** Side list next to the lead: small poster, title, deadline. */
export function CompactCard({ a, today, index = 0, onOpen }: CardProps) {
  return (
    <article
      style={{ "--i": index } as React.CSSProperties}
      className="animate-card-enter group relative flex gap-3 rounded-2xl border border-line bg-surface p-2.5 transition-colors hover:border-brand/60"
    >
      <Thumb
        src={a.image_url}
        category={a.category}
        label={a.category_th}
        sizes="128px"
        className="aspect-[4/3] w-28 shrink-0 rounded-xl sm:w-32"
      />
      <div className="min-w-0 flex-1 py-0.5">
        <Meta a={a} />
        <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold [overflow-wrap:anywhere] group-hover:text-brand">
          <Link
            href={`/a/${a.id}`}
            onClick={opener(a, onOpen)}
            className={STRETCH}
          >
            {a.title}
          </Link>
        </h3>
        {a.deadline && (
          <div className="mt-1.5 text-xs">
            <DeadlineBadge deadline={a.deadline} today={today} />
          </div>
        )}
      </div>
    </article>
  );
}
