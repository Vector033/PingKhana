import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Feed } from "@/components/Feed";
import { getAnnouncements, getMeta, getStats } from "@/lib/api";
import { minutesSince, todayBangkok } from "@/lib/format";

type Search = Record<string, string | string[] | undefined>;

const FILTER_KEYS = [
  "q",
  "category",
  "status",
  "year",
  "major",
  "source",
  "sort",
  "page",
] as const;

function pick(sp: Search): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of FILTER_KEYS) {
    const v = sp[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

function hrefWith(
  current: Record<string, string>,
  change: Record<string, string | null>,
): string {
  const next = { ...current, ...change };
  delete next.page;
  if (change.page) next.page = change.page;
  const qs = new URLSearchParams(
    Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return qs ? `/?${qs}` : "/";
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="mb-6 sm:mb-8">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
          ประกาศทุน สหกิจ งาน และกิจกรรม มช. ในที่เดียว
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted">
          ดึงจากเว็บภาควิชา คณะ และมหาวิทยาลัยทุกชั่วโมง สรุปสั้นๆ
          พร้อมวันปิดรับ กดประกาศที่สนใจแล้วให้ LINE เตือนก่อนปิดรับ 3 วันและ 1
          วัน
        </p>
        <Suspense fallback={<div className="mt-4 h-9" />}>
          <StatsStrip />
        </Suspense>
      </section>
      <Suspense fallback={<ListSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function StatsStrip() {
  await connection();
  const s = await getStats().catch(() => null);
  if (!s) return null;
  const last = s.sources
    .map((x) => x.last_success_at)
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(-1);
  const minutes = last != null ? minutesSince(last) : null;
  // The collector runs hourly; older than 3 hours means it has stalled, so stop pulsing.
  const fresh = minutes != null && minutes <= 180;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
      <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
        <span
          aria-hidden
          className={`relative size-2 rounded-full ${fresh ? "live-dot bg-live" : "bg-line-strong"}`}
        />
        {minutes == null
          ? "ยังไม่เคยดึงข้อมูล"
          : `${fresh ? "อัปเดตล่าสุด" : "อัปเดตครั้งสุดท้าย"} ${agoLabel(minutes)}`}
      </p>
      <dl className="flex flex-wrap gap-x-5 gap-y-1">
        <div>
          <dt className="inline">ประกาศ </dt>
          <dd className="inline font-semibold text-fg tabular-nums">
            {s.announcements}
          </dd>
        </div>
        <div>
          <dt className="inline">ยังเปิดรับ </dt>
          <dd className="inline font-semibold text-fg tabular-nums">
            {s.open_with_deadline}
          </dd>
        </div>
        <div>
          <dt className="inline">จาก </dt>
          <dd className="inline font-semibold text-fg tabular-nums">
            {s.sources.length} เว็บ
          </dd>
        </div>
      </dl>
    </div>
  );
}

function agoLabel(min: number): string {
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(min / 1440)} วันที่แล้ว`;
}

async function Results({ searchParams }: { searchParams: Promise<Search> }) {
  const current = pick(await searchParams);
  // Closed announcements are noise for most visits: show open ones unless asked otherwise.
  const status = current.status ?? "open";
  await connection(); // "today" must be computed per request, not at build time
  const today = todayBangkok();
  let data, meta;
  try {
    [data, meta] = await Promise.all([
      getAnnouncements(
        new URLSearchParams({ page_size: "20", ...current, status }).toString(),
      ),
      getMeta(),
    ]);
  } catch {
    return (
      <p className="rounded-xl border border-line bg-surface p-6 text-muted">
        ตอนนี้โหลดประกาศไม่ได้ ลองรีเฟรชอีกครั้งในอีกสักครู่
      </p>
    );
  }
  const page = Number(current.page ?? 1);
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  const majors = Object.fromEntries(meta.majors.map((m) => [m.id, m.th]));

  const moreFilters = (
    <>
      <FilterGroup title="ชั้นปีที่สมัครได้">
        <FilterLink
          href={hrefWith(current, { year: null })}
          active={!current.year}
        >
          ทุกปี
        </FilterLink>
        {meta.years.slice(0, 4).map((y) => (
          <FilterLink
            key={y}
            href={hrefWith(current, { year: String(y) })}
            active={current.year === String(y)}
          >
            ปี {y}
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup title="เรียงตาม">
        <FilterLink
          href={hrefWith(current, { sort: null })}
          active={(current.sort ?? "new") === "new"}
        >
          ล่าสุด
        </FilterLink>
        <FilterLink
          href={hrefWith(current, { sort: "deadline" })}
          active={current.sort === "deadline"}
        >
          วันปิดรับใกล้สุด
        </FilterLink>
      </FilterGroup>
    </>
  );

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr] md:gap-8">
      <aside className="min-w-0 space-y-3 text-sm md:space-y-5">
        <form action="/" className="space-y-2" role="search">
          <label htmlFor="q" className="font-medium">
            ค้นหา
          </label>
          <input
            id="q"
            name="q"
            type="search"
            enterKeyHint="search"
            defaultValue={current.q}
            placeholder="เช่น ทุน, Python, SCB"
            className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-[var(--brand-ring)] md:text-sm"
          />
          {Object.entries(current)
            .filter(([k]) => k !== "q" && k !== "page")
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
        </form>

        <FilterGroup title="ประเภท">
          <FilterLink
            href={hrefWith(current, { category: null })}
            active={!current.category}
          >
            ทั้งหมด
          </FilterLink>
          {meta.categories.map((c) => (
            <FilterLink
              key={c.id}
              href={hrefWith(current, { category: c.id })}
              active={current.category === c.id}
            >
              {c.th}
            </FilterLink>
          ))}
        </FilterGroup>

        <FilterGroup title="สถานะ">
          {[
            ["open", "ยังเปิดรับ"],
            ["closing", "ปิดรับใน 14 วัน"],
            ["all", "ทั้งหมด (รวมที่ปิดแล้ว)"],
          ].map(([id, label]) => (
            <FilterLink
              key={id}
              href={hrefWith(current, { status: id === "open" ? null : id })}
              active={status === id}
            >
              {label}
            </FilterLink>
          ))}
        </FilterGroup>

        {/* Phones: year and sort fold away so the first screen reaches the feed. */}
        <details
          className="group md:hidden"
          open={Boolean(current.year || current.sort)}
        >
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-muted [&::-webkit-details-marker]:hidden">
            ชั้นปีและการเรียง
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="size-3.5 transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 6l4 4 4-4" strokeLinecap="round" />
            </svg>
          </summary>
          <div className="mt-3 space-y-3">{moreFilters}</div>
        </details>
        <div className="hidden space-y-5 md:block">{moreFilters}</div>
      </aside>

      <section aria-live="polite" className="min-w-0">
        <p className="mb-3 text-sm text-muted [overflow-wrap:anywhere]">
          พบ {data.total} ประกาศ{current.q && <> สำหรับ “{current.q}”</>}
        </p>
        {data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-muted">
            <p>ไม่พบประกาศที่ตรงกับตัวกรองนี้</p>
            <Link
              href="/"
              className="mt-2 inline-flex min-h-11 items-center px-3 font-medium text-brand underline underline-offset-4"
            >
              ล้างตัวกรองทั้งหมด
            </Link>
          </div>
        ) : (
          <Feed items={data.items} today={today} majors={majors} />
        )}
        {pages > 1 && (
          <nav
            className="mt-6 flex items-center justify-between text-sm"
            aria-label="หน้า"
          >
            {page > 1 ? (
              <Link
                className={PAGER}
                href={hrefWith(current, { page: String(page - 1) })}
              >
                ← ก่อนหน้า
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted tabular-nums">
              หน้า {page} / {pages}
            </span>
            {page < pages ? (
              <Link
                className={PAGER}
                href={hrefWith(current, { page: String(page + 1) })}
              >
                ถัดไป →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

const PAGER =
  "inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-surface px-4 transition-colors hover:border-brand hover:text-brand";

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    // One horizontally scrolling row per group on phones, a vertical list in the sidebar on desktop.
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:block md:overflow-visible md:px-0">
      <h2 className="shrink-0 text-xs text-muted md:mb-1 md:text-sm md:font-medium md:text-fg">
        {title}
      </h2>
      <div className="flex shrink-0 gap-1.5 whitespace-nowrap md:flex-wrap md:gap-1 md:whitespace-normal">
        {children}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border px-3.5 transition-[transform,background-color,color,border-color] duration-150 active:scale-95 ${
        active
          ? "border-brand bg-brand-soft font-medium text-brand"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
      }`}
    >
      {children}
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl border border-line bg-surface motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
