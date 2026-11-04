import Link from "next/link";
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

export function DeadlineBadge({
  deadline,
  today,
}: {
  deadline: string;
  today: string;
}) {
  const n = daysLeft(deadline, today);
  const tone =
    n < 0
      ? "text-muted line-through decoration-1"
      : n <= 3
        ? "text-danger font-semibold"
        : "text-fg font-medium";
  return (
    <span className={`text-sm ${tone}`}>
      ปิดรับ {thDate(deadline)}
      {n >= 0 && (
        <span className="ml-1.5 font-normal text-muted">
          · {daysLeftLabel(n)}
        </span>
      )}
    </span>
  );
}

export function AnnouncementCard({
  a,
  today,
}: {
  a: Announcement;
  today: string;
}) {
  return (
    <article className="group relative rounded-xl border border-line bg-surface p-4 transition hover:border-brand/40 hover:shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <CategoryChip category={a.category} label={a.category_th} />
        <span className="text-xs text-muted">{a.source_name}</span>
        {a.published_on && (
          <span className="text-xs text-muted">· {thDate(a.published_on)}</span>
        )}
      </div>
      <h2 className="mt-2 text-base font-semibold leading-snug">
        <Link
          href={`/a/${a.id}`}
          className="after:absolute after:inset-0 group-hover:text-brand"
        >
          {a.title}
        </Link>
      </h2>
      {a.summary_th && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{a.summary_th}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
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
