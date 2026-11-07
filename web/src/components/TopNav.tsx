"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/format";

/** Keeps the other filters when the category or search changes; always back to page 1. */
function hrefWith(
  params: URLSearchParams,
  change: Record<string, string | null>,
) {
  const next = new URLSearchParams(params);
  next.delete("page");
  for (const [k, v] of Object.entries(change)) {
    if (v) next.set(k, v);
    else next.delete(k);
  }
  const qs = next.toString();
  return qs ? `/?${qs}` : "/";
}

export function HeaderSearch({ className = "" }: { className?: string }) {
  const params = useSearchParams();
  const onHome = usePathname() === "/";
  const keep = onHome
    ? [...params.entries()].filter(([k]) => k !== "q" && k !== "page")
    : [];
  return (
    <form action="/" role="search" className={`relative ${className}`}>
      <label htmlFor="q" className="sr-only">
        ค้นหา
      </label>
      <input
        id="q"
        name="q"
        type="search"
        enterKeyHint="search"
        defaultValue={onHome ? (params.get("q") ?? "") : ""}
        placeholder="ค้นหาประกาศ เช่น ทุน, Python, SCB"
        className="min-h-11 w-full rounded-full border border-white/15 bg-white/10 pr-12 pl-4 text-base text-white outline-none placeholder:text-white/60 focus:border-teal-300 focus:bg-white/15 focus:ring-4 focus:ring-teal-300/25 md:text-sm"
      />
      {keep.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        aria-label="ค้นหา"
        className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
      >
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="9" cy="9" r="5.75" />
          <path d="m13.5 13.5 3.25 3.25" />
        </svg>
      </button>
    </form>
  );
}

/** Category tabs under the header bar, like a newspaper's sections. */
export function CategoryTabs() {
  const params = useSearchParams();
  const onHome = usePathname() === "/";
  const active = onHome ? (params.get("category") ?? "") : null;
  const base = onHome ? params : new URLSearchParams();
  const tabs = [{ id: "", th: "ทั้งหมด" }, ...CATEGORIES];
  return (
    <nav
      aria-label="หมวดประกาศ"
      className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]"
    >
      {tabs.map((c) => {
        const on = active === c.id;
        return (
          <Link
            key={c.id || "all"}
            href={hrefWith(base, { category: c.id || null })}
            aria-current={on ? "page" : undefined}
            className={`relative inline-flex min-h-11 shrink-0 items-center px-3 text-sm whitespace-nowrap transition-colors active:scale-95 ${
              on
                ? "font-semibold text-fg after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand"
                : "text-muted hover:text-fg"
            }`}
          >
            {c.th}
          </Link>
        );
      })}
    </nav>
  );
}
