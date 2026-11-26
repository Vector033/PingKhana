"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
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

const THEME_STORAGE_KEY = "pingkhana.theme";

function resolveIsDark(): boolean {
  const root = document.documentElement;
  if (root.classList.contains("dark")) return true;
  if (root.classList.contains("light")) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeTheme(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  mq.addEventListener("change", onChange);
  return () => {
    obs.disconnect();
    mq.removeEventListener("change", onChange);
  };
}

/** Sun/Moon theme toggle using zero-flash transition suppression. */
export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeTheme,
    () => resolveIsDark(),
    () => null,
  );

  function toggle() {
    const root = document.documentElement;
    const nextDark = !resolveIsDark();
    const next = nextDark ? "dark" : "light";

    root.classList.add("theme-switching");
    root.classList.toggle("dark", nextDark);
    root.classList.toggle("light", !nextDark);
    void root.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("theme-switching");
      });
    });

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private browsing / restricted context).
    }
  }

  const label =
    dark === null
      ? "สลับธีมสี"
      : dark
        ? "สลับเป็นโหมดสว่าง"
        : "สลับเป็นโหมดมืด";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-11 shrink-0 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
    >
      {/* Moon icon shown in light mode -> switch to dark */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-[18px] dark:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
      {/* Sun icon shown in dark mode -> switch to light */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="hidden size-[18px] dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
