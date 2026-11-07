import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CategoryChip, DeadlineBadge } from "@/components/AnnouncementCard";
import { RemindSlot } from "@/components/RemindButton";
import { getAnnouncement, getMeta } from "@/lib/api";
import { DISCLAIMER, thDate, todayBangkok } from "@/lib/format";

export default function AnnouncementPage({ params }: PageProps<"/a/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />
      }
    >
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, meta] = await Promise.all([getAnnouncement(id), getMeta()]);
  if (!a) notFound();
  await connection(); // "today" must be computed per request, not at build time
  const today = todayBangkok();
  const majorNames = new Map(meta.majors.map((m) => [m.id, m.th]));

  return (
    <article className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm text-muted hover:text-fg"
      >
        ← ประกาศทั้งหมด
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CategoryChip category={a.category} label={a.category_th} />
        <span className="text-sm text-muted">{a.source_name}</span>
        {a.published_on && (
          <span className="text-sm text-muted">
            · ประกาศ {thDate(a.published_on)}
          </span>
        )}
      </div>
      <h1 className="mt-3 text-2xl leading-snug font-semibold tracking-tight text-balance [overflow-wrap:anywhere]">
        {a.title}
      </h1>

      {a.summary_th && (
        <section className="mt-5">
          <h2 className="text-sm font-medium text-muted">สรุป</h2>
          <p className="mt-1 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">
            {a.summary_th}
          </p>
        </section>
      )}

      <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-xl border border-line bg-surface p-5 text-sm [overflow-wrap:anywhere] sm:grid-cols-2">
        <div>
          <dt className="text-muted">วันปิดรับ</dt>
          <dd className="mt-0.5">
            {a.deadline ? (
              <DeadlineBadge deadline={a.deadline} today={today} />
            ) : (
              "ไม่ระบุ (ดูที่ประกาศต้นทาง)"
            )}
            {a.deadline_text && (
              <div className="mt-0.5 text-xs text-muted">
                ต้นฉบับ: “{a.deadline_text}”
              </div>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted">ชั้นปีที่สมัครได้</dt>
          <dd className="mt-0.5">
            {a.eligible_years
              ? a.eligible_years.map((y) => `ปี ${y}`).join(", ")
              : "ไม่จำกัด / ไม่ระบุ"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">สาขา</dt>
          <dd className="mt-0.5">
            {a.eligible_majors
              ? a.eligible_majors.map((m) => majorNames.get(m) ?? m).join(", ")
              : "ไม่จำกัด / ไม่ระบุ"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">GPAX ขั้นต่ำ</dt>
          <dd className="mt-0.5">
            {a.min_gpax != null ? a.min_gpax.toFixed(2) : "ไม่ระบุ"}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <RemindSlot id={a.id} deadline={a.deadline} today={today} />
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line-strong bg-surface px-5 font-medium hover:border-brand hover:text-brand"
        >
          เปิดประกาศต้นทาง ↗
        </a>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
    </article>
  );
}
