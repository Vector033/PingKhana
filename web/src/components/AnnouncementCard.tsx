import Link from "next/link";
import type { MouseEvent } from "react";
import { Highlight, Thumb } from "@/components/Thumb";
import type { Announcement } from "@/lib/api";
import {
  CATEGORY_STYLE,
  daysLeft,
  daysLeftLabel,
  thDate,
  thDayDate,
  tidyWrap,
} from "@/lib/format";

const CATEGORY_DOT: Record<string, string> = {
  scholarship: "bg-emerald-400",
  internship: "bg-sky-400",
  job: "bg-teal-400",
  activity: "bg-orange-400",
  general: "bg-slate-300",
};

export function CategoryChip({
  category,
  label,
  onImage = false,
  className = "",
}: {
  category: string;
  label: string;
  /** High-contrast dark frosted backing pill for floating over bright poster thumbnails. */
  onImage?: boolean;
  className?: string;
}) {
  if (onImage) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 px-2.5 py-1 text-xs font-medium tracking-[0.02em] text-white shadow-sm ring-1 ring-white/20 backdrop-blur-md ${className}`}
      >
        <span
          aria-hidden
          className={`size-1.5 shrink-0 rounded-full ${CATEGORY_DOT[category] ?? CATEGORY_DOT.general}`}
        />
        {label}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-[0.02em] ring-1 ring-inset ${CATEGORY_STYLE[category] ?? CATEGORY_STYLE.general} ${className}`}
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
  /** Frosted dark high-contrast pill for floating over bright faculty posters. */
  onImage?: boolean;
}) {
  const n = daysLeft(deadline, today);
  const dayDate = thDayDate(deadline);
  if (n >= 0 && n <= 3) {
    return (
      <span
        className={`animate-urgency inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums sm:text-[13px] ${
          onImage
            ? "bg-red-950/90 text-red-50 shadow-md ring-1 ring-red-300/45 backdrop-blur-md"
            : "bg-danger-soft text-danger ring-1 ring-danger/25"
        }`}
      >
        <AlertClockIcon />
        <span className="whitespace-nowrap">ปิด {dayDate}</span>{" "}
        <span className="whitespace-nowrap">· {daysLeftLabel(n)}</span>
      </span>
    );
  }
  if (n < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted line-through decoration-1 tabular-nums">
        <ClockIcon />
        ปิดรับ {thDate(deadline)}
      </span>
    );
  }
  if (onImage) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 rounded-full bg-slate-950/80 px-2.5 py-1 text-xs text-white shadow-sm ring-1 ring-white/20 backdrop-blur-md tabular-nums sm:text-[13px]">
        <ClockIcon />
        <span className="font-semibold whitespace-nowrap">
          ปิด {dayDate}
        </span>{" "}
        <span className="whitespace-nowrap text-white/85">
          · {daysLeftLabel(n)}
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm tabular-nums">
      <ClockIcon />
      {/* #3 Human Touch: student highlighter underline on exact closing day & date. */}
      <span className="marker font-semibold whitespace-nowrap text-fg">
        ปิด {dayDate}
      </span>{" "}
      <span className="whitespace-nowrap text-muted">· {daysLeftLabel(n)}</span>
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
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.25 1.5" />
    </svg>
  );
}

function AlertClockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75v3.5M8 10.75h.01" />
    </svg>
  );
}

/** Bullet for summary lines in the drawer and on the full page. */
export function BulletCheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-1 size-4 shrink-0 text-brand"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.5 8.2 1.6 1.6 3.4-3.5" />
    </svg>
  );
}

function VerifiedSourceIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3 shrink-0 text-brand"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.75 13 3.75v4c0 3.1-2.1 5.6-5 6.5-2.9-.9-5-3.4-5-6.5v-4l5-2Z" />
      <path d="m5.75 8.1 1.5 1.5 3-3.1" />
    </svg>
  );
}

/** Official faculty / department trust pill paired with optional publish date. */
export function SourceTrustPill({
  name,
  publishedOn,
}: {
  name: string;
  publishedOn?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-line bg-surface-2/85 px-2 py-0.5 text-[11px] font-medium text-fg/90">
        <VerifiedSourceIcon />
        <span className="truncate">{name}</span>
      </span>
      {publishedOn && (
        <span className="whitespace-nowrap tabular-nums">
          {thDate(publishedOn)}
        </span>
      )}
    </div>
  );
}

type CardProps = {
  a: Announcement;
  today: string;
  index?: number;
  q?: string;
  majors?: Record<string, string>;
  onOpen?: (a: Announcement) => void;
  /** First row of a page: load the poster eagerly. */
  eager?: boolean;
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
  return <SourceTrustPill name={a.source_name} publishedOn={a.published_on} />;
}

function EligibilityChips({
  a,
  majors,
}: {
  a: Announcement;
  majors?: Record<string, string>;
}) {
  const majorLabels = (a.eligible_majors ?? []).map((m) => majors?.[m] ?? m);
  const hasMeta =
    majorLabels.length > 0 ||
    Boolean(a.eligible_years?.length) ||
    a.min_gpax != null ||
    Boolean(a.tags?.length);
  if (!hasMeta) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-tight text-muted">
      {majorLabels.slice(0, 2).map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-md border border-line bg-surface-2/80 px-2 py-0.5 font-medium text-fg/85"
        >
          {label}
        </span>
      ))}
      {majorLabels.length > 2 && (
        <span className="inline-flex items-center rounded-md border border-line bg-surface-2/80 px-2 py-0.5 whitespace-nowrap tabular-nums">
          +{majorLabels.length - 2} สาขา
        </span>
      )}
      {a.eligible_years && a.eligible_years.length > 0 && (
        <span className="inline-flex items-center rounded-md border border-line bg-surface-2/80 px-2 py-0.5 font-medium whitespace-nowrap text-fg/85 tabular-nums">
          ชั้นปี {a.eligible_years.join(", ")}
        </span>
      )}
      {a.min_gpax != null && (
        <span className="inline-flex items-center rounded-md border border-line bg-surface-2/80 px-2 py-0.5 font-medium whitespace-nowrap text-fg/85 tabular-nums">
          GPAX ≥ {a.min_gpax.toFixed(2)}
        </span>
      )}
      {a.tags?.slice(0, 2).map((t) => (
        <span key={t} className="px-0.5 whitespace-nowrap text-muted">
          #{t}
        </span>
      ))}
    </div>
  );
}

/** Grid card: poster on top, then source, title, summary and the deadline. */
export function AnnouncementCard({
  a,
  today,
  index = 0,
  q,
  majors,
  onOpen,
  eager,
}: CardProps) {
  const urgent = isUrgent(a.deadline, today);
  const title = tidyWrap(a.title);
  const summary = a.summary_th ? tidyWrap(a.summary_th) : null;
  return (
    <article
      style={{ "--i": index } as React.CSSProperties}
      className="animate-card-enter group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[transform,box-shadow,border-color] duration-200 hover:border-brand/55 hover:shadow-card motion-safe:hover:-translate-y-1"
    >
      {urgent && (
        <div
          aria-hidden="true"
          className="thermal-urgent pointer-events-none absolute inset-0 z-0"
        />
      )}
      <div className="relative z-[1]">
        <Thumb
          src={a.image_url}
          category={a.category}
          label={a.category_th}
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          eager={eager}
          className="aspect-[16/9]"
        />
        <CategoryChip
          category={a.category}
          label={a.category_th}
          onImage
          className="absolute top-3 left-3"
        />
      </div>
      <div className="relative z-[1] flex flex-1 flex-col p-4">
        <Meta a={a} />
        <h3 className="mt-2 line-clamp-3 text-base leading-[1.3] font-semibold tracking-[-0.01em] text-balance [overflow-wrap:anywhere] group-hover:text-brand">
          <Link
            href={`/a/${a.id}`}
            onClick={opener(a, onOpen)}
            className={STRETCH}
          >
            <Highlight text={title} q={q} />
          </Link>
        </h3>
        {summary && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-[1.6] text-pretty text-muted [overflow-wrap:anywhere]">
            <Highlight text={summary} q={q} />
          </p>
        )}
        <div className="mt-auto space-y-2.5 pt-3.5 text-xs text-muted">
          <div>
            {a.deadline ? (
              <DeadlineBadge deadline={a.deadline} today={today} />
            ) : a.category === "general" ? null : (
              <span>ไม่ระบุวันปิดรับ</span>
            )}
          </div>
          <EligibilityChips a={a} majors={majors} />
        </div>
      </div>
    </article>
  );
}

/** Front-page lead: a large poster, then a big title. Posters are mostly text, so no text on top. */
export function LeadCard({ a, today, majors, onOpen }: CardProps) {
  const urgent = isUrgent(a.deadline, today);
  return (
    <article className="animate-card-enter group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:border-brand/55 hover:shadow-card motion-safe:hover:-translate-y-1">
      {urgent && (
        <div
          aria-hidden="true"
          className="thermal-urgent pointer-events-none absolute inset-0 z-0"
        />
      )}
      <div className="relative z-[1]">
        <Thumb
          src={a.image_url}
          category={a.category}
          label={a.category_th}
          sizes="(min-width: 1024px) 680px, 100vw"
          eager
          className="aspect-[16/9]"
        />
        {a.deadline && (
          <div className="absolute top-3 right-3">
            <DeadlineBadge deadline={a.deadline} today={today} onImage />
          </div>
        )}
      </div>
      <div className="relative z-[1] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <CategoryChip category={a.category} label={a.category_th} />
          <SourceTrustPill name={a.source_name} publishedOn={a.published_on} />
        </div>
        <h3 className="mt-2.5 line-clamp-3 text-xl leading-[1.3] font-semibold tracking-[-0.02em] text-balance [overflow-wrap:anywhere] group-hover:text-brand sm:text-2xl">
          <Link
            href={`/a/${a.id}`}
            onClick={opener(a, onOpen)}
            className={STRETCH}
          >
            {tidyWrap(a.title)}
          </Link>
        </h3>
        {a.summary_th && (
          <p className="mt-2 line-clamp-2 max-w-[65ch] leading-[1.6] text-pretty text-muted">
            {tidyWrap(a.summary_th)}
          </p>
        )}
        <div className="mt-3">
          <EligibilityChips a={a} majors={majors} />
        </div>
      </div>
    </article>
  );
}

/** Side list next to the lead: small poster, title, deadline. */
export function CompactCard({ a, today, index = 0, onOpen }: CardProps) {
  const urgent = isUrgent(a.deadline, today);
  return (
    <article
      style={{ "--i": index } as React.CSSProperties}
      className="animate-card-enter group relative flex gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-2 transition-[box-shadow,border-color] duration-200 hover:border-brand/55 hover:shadow-sm"
    >
      {urgent && (
        <div
          aria-hidden="true"
          className="thermal-urgent pointer-events-none absolute inset-0 z-0"
        />
      )}
      <Thumb
        src={a.image_url}
        category={a.category}
        label={a.category_th}
        sizes="128px"
        className="relative z-[1] aspect-[4/3] w-28 shrink-0 rounded-lg sm:w-32"
      />
      <div className="relative z-[1] min-w-0 flex-1 py-0.5 pr-1">
        <Meta a={a} />
        <h3 className="mt-1.5 line-clamp-2 text-sm leading-[1.3] font-semibold text-balance [overflow-wrap:anywhere] group-hover:text-brand">
          <Link
            href={`/a/${a.id}`}
            onClick={opener(a, onOpen)}
            className={STRETCH}
          >
            {tidyWrap(a.title)}
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
