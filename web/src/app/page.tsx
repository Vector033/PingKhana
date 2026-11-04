import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { getAnnouncements, getMeta, getStats } from "@/lib/api";
import { todayBangkok } from "@/lib/format";

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
      <section className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          ประกาศทุน สหกิจ งาน และกิจกรรม มช. ในที่เดียว
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          รวบรวมจากเว็บภาควิชา คณะ และมหาวิทยาลัยทุกชั่วโมง สรุปสั้นๆ
          พร้อมวันปิดรับ แอด LINE แล้วกด “เตือนฉัน” ให้เตือนก่อนปิดรับ 3 วันและ
          1 วัน
        </p>
        <Suspense fallback={<div className="mt-4 h-6" />}>
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
  return (
    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
      <div>
        <dt className="inline">ประกาศทั้งหมด </dt>
        <dd className="inline font-semibold text-fg">{s.announcements}</dd>
      </div>
      <div>
        <dt className="inline">ยังเปิดรับ (มีวันปิด) </dt>
        <dd className="inline font-semibold text-fg">{s.open_with_deadline}</dd>
      </div>
      <div>
        <dt className="inline">แหล่งข้อมูล </dt>
        <dd className="inline font-semibold text-fg">{s.sources.length}</dd>
      </div>
    </dl>
  );
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
        เชื่อมต่อ API ไม่ได้ในขณะนี้ ลองใหม่อีกครั้งภายหลัง
      </p>
    );
  }
  const page = Number(current.page ?? 1);
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <aside className="min-w-0 space-y-3 text-sm md:space-y-5">
        <form action="/" className="space-y-2" role="search">
          <label htmlFor="q" className="font-medium">
            ค้นหา
          </label>
          <input
            id="q"
            name="q"
            defaultValue={current.q}
            placeholder="เช่น ทุน, Python, SCB"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
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

        <FilterGroup title="ชั้นปีที่สมัครได้">
          <div className="flex gap-1.5">
            <FilterLink
              href={hrefWith(current, { year: null })}
              active={!current.year}
              compact
            >
              ทุกปี
            </FilterLink>
            {meta.years.slice(0, 4).map((y) => (
              <FilterLink
                key={y}
                href={hrefWith(current, { year: String(y) })}
                active={current.year === String(y)}
                compact
              >
                ปี {y}
              </FilterLink>
            ))}
          </div>
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
      </aside>

      <section aria-live="polite" className="min-w-0">
        <p className="mb-3 text-sm text-muted">
          พบ {data.total} ประกาศ{current.q && <> สำหรับ “{current.q}”</>}
        </p>
        {data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
            ไม่พบประกาศที่ตรงกับตัวกรอง{" "}
            <Link href="/" className="text-brand underline">
              ล้างตัวกรอง
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((a) => (
              <AnnouncementCard key={a.id} a={a} today={today} />
            ))}
          </div>
        )}
        {pages > 1 && (
          <nav
            className="mt-6 flex items-center justify-between text-sm"
            aria-label="หน้า"
          >
            {page > 1 ? (
              <Link
                className="rounded-lg border border-line px-3 py-1.5 hover:border-brand"
                href={hrefWith(current, { page: String(page - 1) })}
              >
                ← ก่อนหน้า
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted">
              หน้า {page} / {pages}
            </span>
            {page < pages ? (
              <Link
                className="rounded-lg border border-line px-3 py-1.5 hover:border-brand"
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

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    // One horizontally scrolling row per group on phones, a vertical list in the sidebar on desktop.
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:block md:px-0">
      <h2 className="shrink-0 text-xs text-muted md:mb-1.5 md:text-sm md:font-medium md:text-fg">
        {title}
      </h2>
      <div className="flex shrink-0 gap-1.5 whitespace-nowrap md:flex-col md:items-start md:gap-0.5">
        {children}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  compact,
  children,
}: {
  href: string;
  active: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2 py-1 transition ${compact ? "md:inline-block" : ""} ${
        active
          ? "bg-brand-soft font-medium text-brand"
          : "text-muted hover:bg-line/60 hover:text-fg"
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
          className="h-28 animate-pulse rounded-xl border border-line bg-surface"
        />
      ))}
    </div>
  );
}
