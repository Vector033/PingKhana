import Link from "next/link";
import { connection } from "next/server";
import {
  ClosingHero,
  Feed,
  NewsStrip,
  PreviewProvider,
  TaggedStrip,
} from "@/components/Feed";
import { followOrg } from "@/app/follow/actions";
import { OrgPicker } from "@/components/OrgPicker";
import { getAnnouncements, getMeta, getStats, getTags } from "@/lib/api";
import { getFollowed, getFollowedTags } from "@/lib/follow";
import { minutesSince, todayBangkok } from "@/lib/format";

export type Search = Record<string, string | string[] | undefined>;

const FILTER_KEYS = [
  "q",
  "category",
  "status",
  "major",
  "source",
  "org",
  "following",
  "sort",
  "pack",
  "tag",
  "all",
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
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
      <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/70 px-3 py-1.5 whitespace-nowrap tabular-nums">
        <span
          aria-hidden
          className={`relative size-2 shrink-0 rounded-full ${fresh ? "live-dot bg-live" : "bg-line-strong"}`}
        />
        {minutes == null
          ? "ยังไม่เคยดึงข้อมูล"
          : `${fresh ? "อัปเดตล่าสุด" : "อัปเดตครั้งสุดท้าย"}\u00A0${agoLabel(minutes)}`}
      </p>
      <dl className="flex flex-wrap gap-x-5 gap-y-1">
        <div className="whitespace-nowrap">
          <dt className="inline">ประกาศ </dt>
          <dd className="inline font-semibold text-fg tabular-nums">
            {s.announcements}
          </dd>
        </div>
        <div className="whitespace-nowrap">
          <dt className="inline">มีวันปิดรับ </dt>
          <dd className="inline font-semibold text-fg tabular-nums">
            {s.open_with_deadline}
          </dd>
        </div>
        <div className="whitespace-nowrap">
          <dt className="inline">จาก </dt>
          <dd className="inline font-semibold text-fg tabular-nums">
            {s.sources.length}
            {"\u00A0"}เว็บ
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
  // Followed sources (cookie) narrow every list unless the visitor picked a pack or asked for all.
  const [followed, followedTags] = await Promise.all([
    getFollowed(),
    getFollowedTags(),
  ]);
  const follow =
    followed.length > 0 &&
    !current.pack &&
    !current.source &&
    !current.org &&
    !current.all
      ? followed.join(",")
      : null;
  // "ที่ติดตาม" with nothing followed yet: show how to start instead of an empty list.
  const onboarding = current.following === "1" && followed.length === 0;
  // `following` is a page state, not an API filter.
  const apiParams = Object.fromEntries(
    Object.entries(current).filter(([k]) => k !== "following"),
  );
  const withFollow = (qs: string) => (follow ? `${qs}&sources=${follow}` : qs);
  let data, meta, closing, latestNews, popular, tagged;
  try {
    [data, meta, closing, latestNews, popular, tagged] = await Promise.all([
      getAnnouncements(
        new URLSearchParams({
          page_size: news ? "21" : "20",
          ...apiParams,
          status,
          kind: zone,
          ...(follow ? { sources: follow } : {}),
        }).toString(),
      ),
      getMeta(),
      front && !news
        ? getAnnouncements(
            withFollow("kind=open&status=closing&sort=deadline&page_size=4"),
          )
        : null,
      front && !news
        ? getAnnouncements(withFollow("kind=news&page_size=4"))
        : null,
      getTags().catch(() => []),
      front && followedTags.length
        ? getAnnouncements(
            `status=open&page_size=4&tags=${encodeURIComponent(followedTags.join(","))}`,
          )
        : null,
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

  // Year is not a web filter: almost no post names one (those that don't match every year),
  // and half the feed is for teachers. The LINE settings still use year to pick what to send.
  const sortFilter = (
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
  );

  const heading = current.tag
    ? `#${current.tag}`
    : current.q
      ? "ผลการค้นหา"
      : news
        ? "ข่าวล่าสุด"
        : current.category
          ? (meta.categories.find((c) => c.id === current.category)?.th ??
            "ประกาศ")
          : "เปิดรับสมัครล่าสุด";

  const sourceName = (id: string) =>
    meta.sources.find((s) => s.id === id)?.name ?? id;
  // Picking a scope replaces the others.
  const scopeOff = {
    pack: null,
    org: null,
    source: null,
    all: null,
    following: null,
  };
  const picker = (
    <OrgPicker
      orgs={(meta.orgs ?? []).map((o) => ({
        name: o.name,
        count: o.count,
        href: href({ ...scopeOff, org: o.id }),
        active: current.org === o.id,
      }))}
      sources={meta.sources.map((s) => ({
        name: s.name,
        org: s.org,
        href: href({ ...scopeOff, source: s.id }),
        active: current.source === s.id,
      }))}
      label={
        current.org ??
        (current.source ? sourceName(current.source) : "เลือกสถาบัน / แหล่ง")
      }
      active={Boolean(current.org || current.source)}
    />
  );

  // What is narrowing the list right now, each removable on its own.
  const chips: [string, string][] = [];
  if (current.pack)
    chips.push([
      meta.packs?.find((p) => p.id === current.pack)?.th ?? current.pack,
      href({ pack: null }),
    ]);
  if (current.org) chips.push([current.org, href({ org: null })]);
  if (current.source)
    chips.push([sourceName(current.source), href({ source: null })]);
  if (current.tag) chips.push([`#${current.tag}`, href({ tag: null })]);
  if (!news && status !== "open")
    chips.push([STATUS_LABEL[status] ?? status, href({ status: null })]);
  if (current.q) chips.push([`“${current.q}”`, href({ q: null })]);

  const packFilter = (
    <FilterGroup title="แหล่ง" wrap>
      <FilterLink
        href={href({
          ...scopeOff,
          following: followed.length > 0 ? null : "1",
        })}
        active={Boolean(follow) || onboarding}
      >
        ที่ติดตาม{followed.length > 0 && ` (${followed.length})`}
      </FilterLink>
      <FilterLink
        href={href({ ...scopeOff, all: followed.length > 0 ? "1" : null })}
        active={
          !follow &&
          !onboarding &&
          !current.pack &&
          !current.org &&
          !current.source
        }
      >
        ทั้งหมด
      </FilterLink>
      {(meta.packs ?? []).map((p) => (
        <FilterLink
          key={p.id}
          href={href({ ...scopeOff, pack: p.id })}
          active={current.pack === p.id}
        >
          {p.th}
        </FilterLink>
      ))}
      {picker}
    </FilterGroup>
  );

  return (
    <PreviewProvider
      today={today}
      majors={majors}
      q={current.q}
      followed={followed}
    >
      {closing && closing.items.length > 0 && (
        <ClosingHero items={closing.items} />
      )}
      {tagged && tagged.items.length > 0 && (
        <TaggedStrip items={tagged.items} tags={followedTags} />
      )}
      <section aria-label="รายการประกาศ" aria-live="polite" className="min-w-0">
        <div className="mb-6 border-b border-line pb-4 sm:mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {heading}
            </h2>
            {!onboarding && (
              <p className="text-sm text-pretty text-muted [overflow-wrap:anywhere]">
                <span className="whitespace-nowrap tabular-nums">
                  พบ {data.total} ประกาศ
                </span>
                {current.q && <> สำหรับ “{current.q}”</>}
              </p>
            )}
          </div>
          {/* Category and search live in the header. Here: 1. whose posts (scope, groups,
              institution), 2. what is filtering now, 3. narrower refinements. */}
          <div className="mt-3 space-y-2 text-sm">
            {packFilter}
            {chips.length > 0 && (
              <div
                role="group"
                aria-label="ตัวกรองที่ใช้อยู่"
                className="flex flex-wrap items-center gap-2"
              >
                {chips.map(([label, to]) => (
                  <Link
                    key={label}
                    href={to}
                    aria-label={`เอาตัวกรอง ${label} ออก`}
                    className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full bg-brand-soft pr-3 pl-3.5 font-medium text-brand transition-transform duration-150 active:scale-95"
                  >
                    <span className="truncate">{label}</span>
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="size-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    >
                      <path d="M6 6l8 8M14 6l-8 8" />
                    </svg>
                  </Link>
                ))}
                <Link
                  href={base}
                  className="inline-flex min-h-11 items-center px-2 font-medium whitespace-nowrap text-muted underline-offset-4 hover:text-fg hover:underline"
                >
                  ล้างตัวกรองทั้งหมด
                </Link>
              </div>
            )}
            {popular.length > 0 && (
              <FilterGroup title="แท็ก" scroll>
                {popular.slice(0, 10).map((t) => (
                  <FilterLink
                    key={t.tag}
                    href={href({ tag: t.tag })}
                    active={current.tag === t.tag}
                  >
                    #{t.tag}
                  </FilterLink>
                ))}
              </FilterGroup>
            )}
            {!news && (
              <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-x-6">
                <FilterGroup title="สถานะ">
                  {Object.entries(STATUS_LABEL).map(([id, label]) => (
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
                {sortFilter}
              </div>
            )}
          </div>
        </div>
        {onboarding ? (
          <EmptyFollowing orgs={meta.orgs ?? []} picker={picker} />
        ) : data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-muted">
            <p className="text-pretty">ไม่พบประกาศที่ตรงกับตัวกรองนี้</p>
            <Link
              href={base}
              className="mt-2 inline-flex min-h-11 items-center px-3 font-medium whitespace-nowrap text-brand underline underline-offset-4"
            >
              ล้างตัวกรองทั้งหมด
            </Link>
          </div>
        ) : (
          <Feed
            items={data.items}
            eager={!closing?.items.length && !tagged?.items.length}
          />
        )}
        {pages > 1 && !onboarding && (
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
            <span className="whitespace-nowrap text-muted tabular-nums">
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
  "inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-surface px-4 whitespace-nowrap transition-colors hover:border-brand hover:text-brand";

const STATUS_LABEL: Record<string, string> = {
  open: "ยังเปิดรับ",
  closing: "ปิดรับใน 14 วัน",
  all: "รวมที่ปิดแล้ว",
};

function FilterGroup({
  title,
  scroll = false,
  wrap = false,
  children,
}: {
  title: string;
  /** Wrap on phones too, so the last item (the institution picker) is never off-screen. */
  wrap?: boolean;
  /** Stay one line on every screen (tags) instead of wrapping on desktop. */
  scroll?: boolean;
  children: React.ReactNode;
}) {
  return (
    // One row per group; scrolls sideways on phones instead of wrapping (unless `wrap`).
    <div
      className={
        wrap
          ? "flex items-start gap-2"
          : `-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] ${scroll ? "" : "md:mx-0 md:overflow-visible md:px-0"}`
      }
    >
      <h3
        className={`shrink-0 text-xs text-muted md:self-start md:leading-11 ${wrap ? "leading-11" : ""}`}
      >
        {title}
      </h3>
      <div
        className={
          wrap
            ? "flex min-w-0 flex-wrap gap-1.5 whitespace-nowrap"
            : `flex shrink-0 gap-1.5 whitespace-nowrap ${scroll ? "" : "md:shrink md:flex-wrap"}`
        }
      >
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

export function ListSkeleton() {
  return (
    // Same grid and card shape as <Feed>, so nothing jumps when the list arrives.
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface motion-reduce:animate-none"
        >
          <div className="aspect-[16/9] bg-surface-2" />
          <div className="space-y-2.5 p-4">
            <div className="h-3 w-1/3 rounded bg-surface-2" />
            <div className="h-4 w-11/12 rounded bg-surface-2" />
            <div className="h-4 w-2/3 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** "ที่ติดตาม" before anything is followed: busiest institutions as one-click follows. */
function EmptyFollowing({
  orgs,
  picker,
}: {
  orgs: { name: string; count: number }[];
  picker: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          >
            <path d="M6.5 3.5h11a1 1 0 0 1 1 1V20l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="text-lg leading-[1.3] font-semibold text-balance">
            เริ่มสร้างฟีดของคุณ
          </h3>
          <p className="mt-1 max-w-[60ch] text-pretty text-muted">
            ติดตามมหาวิทยาลัยหรือหน่วยงานที่สนใจ แล้วแท็บนี้จะแสดงเฉพาะประกาศจากที่นั่น
            จำไว้ในเบราว์เซอร์นี้ ไม่ต้องสมัครสมาชิก
          </p>
        </div>
      </div>
      {orgs.length > 0 && (
        <form action={followOrg} className="mt-4 flex flex-wrap gap-2">
          {orgs.slice(0, 3).map((o) => (
            <button
              key={o.name}
              name="org"
              value={o.name}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-brand bg-brand-soft px-4 text-sm font-medium text-brand transition-transform duration-150 active:scale-95"
            >
              + ติดตาม {o.name}
              <span className="font-normal tabular-nums opacity-80">
                ({o.count})
              </span>
            </button>
          ))}
        </form>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
        <span>หรือค้นหาเอง</span>
        {picker}
        <Link
          href="/follow"
          className="inline-flex min-h-11 items-center font-medium whitespace-nowrap text-brand underline-offset-4 hover:underline"
        >
          เลือกทีละแหล่ง
        </Link>
      </div>
    </div>
  );
}
