"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
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
  const path = usePathname();
  const onHome = path === "/" || path === "/news";
  const action = path === "/news" ? "/news" : "/";
  const keep = onHome
    ? [...params.entries()].filter(([k]) => k !== "q" && k !== "page")
    : [];
  return (
    <form action={action} role="search" className={`relative ${className}`}>
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
        className="min-h-11 w-full rounded-full border border-white/15 bg-white/10 pr-12 pl-4 text-base text-white transition-[background-color,border-color,box-shadow] duration-150 outline-none placeholder:text-white/70 focus:border-teal-300 focus:bg-white/15 focus:ring-4 focus:ring-teal-300/25 md:text-sm"
      />
      {keep.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        aria-label="ค้นหา"
        className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
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
  const path = usePathname();
  const onHome = path === "/";
  const active = onHome ? (params.get("category") ?? "") : null;
  const base = onHome ? params : new URLSearchParams();
  const nav = useRef<HTMLElement>(null);
  // On phones the row scrolls sideways: keep the current tab in view.
  useEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const row = nav.current;
    if (el && row)
      row.scrollLeft = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
  }, [path, params]);
  // General news lives on /news; the tabs here are things to apply for.
  const tabs = [
    { id: "", th: "เปิดรับทั้งหมด" },
    ...CATEGORIES.filter((c) => c.id !== "general"),
  ];
  return (
    <nav
      ref={nav}
      aria-label="หมวดประกาศ"
      className="-mb-px flex gap-1 overflow-x-auto py-1 [scrollbar-width:none]"
    >
      {tabs.map((c) => {
        const on = active === c.id;
        return (
          <Link
            key={c.id || "all"}
            href={hrefWith(base, { category: c.id || null })}
            aria-current={on ? "page" : undefined}
            className={`relative inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-95 ${
              on
                ? "bg-brand-soft/80 font-semibold text-brand"
                : "text-muted hover:bg-surface-2/80 hover:text-fg"
            }`}
          >
            {c.th}
          </Link>
        );
      })}
      <span aria-hidden className="mx-1.5 my-3 w-px shrink-0 bg-line-strong" />
      <Link
        href="/news"
        aria-current={path === "/news" ? "page" : undefined}
        className={`relative inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-95 ${
          path === "/news"
            ? "bg-brand-soft/80 font-semibold text-brand"
            : "text-muted hover:bg-surface-2/80 hover:text-fg"
        }`}
      >
        ข่าวสาร
      </Link>
    </nav>
  );
}
