import Link from "next/link";
import { connection } from "next/server";
import {
  ClosingHero,
  Feed,
  NewsStrip,
  PreviewProvider,
} from "@/components/Feed";
import { getAnnouncements, getMeta, getStats } from "@/lib/api";
import { minutesSince, todayBangkok } from "@/lib/format";

export type Search = Record<string, string | string[] | undefined>;

const FILTER_KEYS = [
  "q",
  "category",
  "status",
  "year",
  "major",
  "source",
  "sort",
  "pack",
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
  base = "/",
): string {
  const next = { ...current, ...change };
  delete next.page;
  if (change.page) next.page = change.page;
  const qs = new URLSearchParams(
    Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

export async function StatsStrip() {
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

/**
 * "open": things to apply for (front page). "news": general news, no deadlines (/news).
 * Both read the same URL filters; links stay on the zone's own path.
 */
export async function Listing({
  searchParams,
  zone,
}: {
  searchParams: Promise<Search>;
  zone: "open" | "news";
}) {
  const current = pick(await searchParams);
  const news = zone === "news";
  const base = news ? "/news" : "/";
  const href = (change: Record<string, string | null>) =>
    hrefWith(current, change, base);
  // Closed announcements are noise for most visits: show open ones unless asked otherwise.
  // News has no deadlines, so it is never filtered by status.
  const status = news ? "all" : (current.status ?? "open");
  await connection(); // "today" must be computed per request, not at build time
  const today = todayBangkok();
  // The front page (no filter, no search) leads with the deadlines closing soonest.
  const front = Object.keys(current).length === 0;
  let data, meta, closing, latestNews;
  try {
    [data, meta, closing, latestNews] = await Promise.all([
      getAnnouncements(
        new URLSearchParams({
          page_size: news ? "21" : "20",
          ...current,
          status,
          kind: zone,
        }).toString(),
      ),
      getMeta(),
      front && !news
        ? getAnnouncements("kind=open&status=closing&sort=deadline&page_size=4")
        : null,
      front && !news ? getAnnouncements("kind=news&page_size=4") : null,
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
      <FilterGroup title="ชั้นปี">
        <FilterLink href={href({ year: null })} active={!current.year}>
          ทุกปี
        </FilterLink>
        {meta.years.slice(0, 4).map((y) => (
          <FilterLink
            key={y}
            href={href({ year: String(y) })}
            active={current.year === String(y)}
          >
            ปี {y}
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup title="เรียงตาม">
        <FilterLink
          href={href({ sort: null })}
          active={(current.sort ?? "new") === "new"}
        >
          ล่าสุด
        </FilterLink>
        <FilterLink
          href={href({ sort: "deadline" })}
          active={current.sort === "deadline"}
        >
          วันปิดรับใกล้สุด
        </FilterLink>
      </FilterGroup>
    </>
  );

  const heading = current.q
    ? "ผลการค้นหา"
    : news
      ? "ข่าวล่าสุด"
      : current.category
        ? (meta.categories.find((c) => c.id === current.category)?.th ??
          "ประกาศ")
        : "เปิดรับสมัครล่าสุด";

  const packFilter = meta.packs && meta.packs.length > 1 && (
    <FilterGroup title="แหล่ง">
      <FilterLink href={href({ pack: null })} active={!current.pack}>
        ทั้งหมด
      </FilterLink>
      {meta.packs.map((p) => (
        <FilterLink
          key={p.id}
          href={href({ pack: p.id })}
          active={current.pack === p.id}
        >
          {p.th}
        </FilterLink>
      ))}
    </FilterGroup>
  );

  return (
    <PreviewProvider today={today} majors={majors} q={current.q}>
      {closing && closing.items.length > 0 && (
        <ClosingHero items={closing.items} />
      )}
      <section aria-label="รายการประกาศ" aria-live="polite" className="min-w-0">
        <div className="mb-4 border-b border-line pb-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {heading}
            </h2>
            <p className="text-sm text-muted [overflow-wrap:anywhere]">
              พบ {data.total} ประกาศ{current.q && <> สำหรับ “{current.q}”</>}
            </p>
          </div>
          {/* Category and search live in the header; these narrow the list further. */}
          <div className="mt-3 flex flex-col gap-2 text-sm md:flex-row md:flex-wrap md:items-center md:gap-x-6">
            {packFilter}
            {!news && (
              <FilterGroup title="สถานะ">
                {[
                  ["open", "ยังเปิดรับ"],
                  ["closing", "ปิดรับใน 14 วัน"],
                  ["all", "รวมที่ปิดแล้ว"],
                ].map(([id, label]) => (
                  <FilterLink
                    key={id}
                    href={href({
                      status: id === "open" ? null : id,
                    })}
                    active={status === id}
                  >
                    {label}
                  </FilterLink>
                ))}
              </FilterGroup>
            )}
            {!news && (
              <>
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
                  <div className="mt-2 space-y-2">{moreFilters}</div>
                </details>
                <div className="hidden md:contents">{moreFilters}</div>
              </>
            )}
          </div>
        </div>
        {data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-muted">
            <p>ไม่พบประกาศที่ตรงกับตัวกรองนี้</p>
            <Link
              href={base}
              className="mt-2 inline-flex min-h-11 items-center px-3 font-medium text-brand underline underline-offset-4"
            >
              ล้างตัวกรองทั้งหมด
            </Link>
          </div>
        ) : (
          <Feed items={data.items} />
        )}
        {pages > 1 && (
          <nav
            className="mt-6 flex items-center justify-between text-sm"
            aria-label="หน้า"
          >
            {page > 1 ? (
              <Link className={PAGER} href={href({ page: String(page - 1) })}>
                ← ก่อนหน้า
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted tabular-nums">
              หน้า {page} / {pages}
            </span>
            {page < pages ? (
              <Link className={PAGER} href={href({ page: String(page + 1) })}>
                ถัดไป →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
      {latestNews && latestNews.items.length > 0 && (
        <NewsStrip items={latestNews.items} />
      )}
    </PreviewProvider>
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
    // One row per group; scrolls sideways on phones instead of wrapping.
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0">
      <h3 className="shrink-0 text-xs text-muted">{title}</h3>
      <div className="flex shrink-0 gap-1.5 whitespace-nowrap">{children}</div>
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

export function ListSkeleton() {
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
