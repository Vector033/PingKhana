import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  CategoryChip,
  DeadlineBadge,
  SourceTrustPill,
} from "@/components/AnnouncementCard";
import { RemindSlot } from "@/components/RemindButton";
import { ShareRow } from "@/components/ShareRow";
import { TagLinks } from "@/components/TagLinks";
import { Thumb } from "@/components/Thumb";
import { getAnnouncement, getMeta } from "@/lib/api";
import { DISCLAIMER, thDate, tidyWrap, todayBangkok } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/a/[id]">): Promise<Metadata> {
  const { id } = await params;
  const a = await getAnnouncement(id).catch(() => null);
  if (!a) return { title: "ไม่พบประกาศ" };
  const description =
    (a.deadline ? `ปิดรับ ${thDate(a.deadline)} · ` : "") +
    (a.summary_th ?? a.source_name).slice(0, 160);
  return {
    title: a.title.slice(0, 90),
    description,
    openGraph: {
      title: a.title,
      description,
      images: a.image_url ? [{ url: a.image_url }] : undefined,
    },
  };
}

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

  const points = (a.summary_th ?? "")
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-2xl pb-4">
      <Link
        href="/"
        className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm whitespace-nowrap text-muted hover:text-fg"
      >
        ← ประกาศทั้งหมด
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <CategoryChip category={a.category} label={a.category_th} />
        <SourceTrustPill name={a.source_name} publishedOn={a.published_on} />
      </div>
      <h1 className="mt-3 text-2xl leading-[1.3] font-semibold tracking-[-0.02em] text-balance [overflow-wrap:anywhere]">
        {tidyWrap(a.title)}
      </h1>

      {a.image_url && (
        <Thumb
          src={a.image_url}
          category={a.category}
          label={a.category_th}
          sizes="(min-width: 768px) 672px, 100vw"
          priority
          className="mt-6 aspect-[16/9] rounded-2xl border border-line"
        />
      )}

      {points.length > 0 && (
        <section className="mt-6" aria-labelledby="detail-summary-heading">
          <h2
            id="detail-summary-heading"
            className="text-sm font-medium text-muted"
          >
            สรุป
          </h2>
          {points.length > 1 ? (
            <ul className="mt-2 max-w-[65ch] space-y-2 leading-[1.6] text-pretty [overflow-wrap:anywhere]">
              {points.map((p, idx) => (
                <li key={`${idx}-${p}`} className="flex items-start gap-2.5">
                  <SummaryBulletIcon />
                  <span>{tidyWrap(p)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 max-w-[65ch] leading-[1.6] text-pretty [overflow-wrap:anywhere]">
              {tidyWrap(points[0])}
            </p>
          )}
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
          <dd className="mt-0.5 tabular-nums">
            {a.min_gpax != null ? a.min_gpax.toFixed(2) : "ไม่ระบุ"}
          </dd>
        </div>
      </dl>

      <div className="contents sm:mt-6 sm:flex sm:flex-row sm:items-start sm:gap-3">
        <div className="sticky bottom-3 z-10 mt-6 rounded-2xl border border-line bg-surface/95 p-3 shadow-card backdrop-blur-md sm:static sm:mt-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          <RemindSlot
            id={a.id}
            deadline={a.deadline}
            today={today}
            className="w-full sm:w-auto"
          />
        </div>
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface px-5 font-medium whitespace-nowrap hover:border-brand hover:text-brand sm:mt-0 sm:inline-flex sm:w-auto"
        >
          เปิดประกาศต้นทาง ↗
        </a>
      </div>
      <div className="mt-3">
        <ShareRow a={a} today={today} />
      </div>
      <div className="mt-4">
        <TagLinks a={a} />
      </div>
      {a.also_on && (
        <p className="mt-4 text-sm text-pretty text-muted">
          ประกาศนี้ลงในเว็บอื่นด้วย:{" "}
          {a.also_on.map((o, i) => (
            <span key={o.url}>
              {i > 0 && ", "}
              <a
                href={o.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg underline underline-offset-2 hover:text-brand"
              >
                {o.source_name}
              </a>
            </span>
          ))}
        </p>
      )}
      <p className="mt-6 text-xs leading-relaxed text-balance text-muted">
        {DISCLAIMER}
      </p>
    </article>
  );
}

function SummaryBulletIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-1 size-4 shrink-0 text-brand"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.5 8.2 1.6 1.6 3.4-3.5" />
    </svg>
  );
}
