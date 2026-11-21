"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

export type PickerItem = {
  name: string;
  href: string;
  active: boolean;
  /** Number of posts, shown as a badge. */
  count?: number;
  /** Extra text on the right, e.g. a source's institution. */
  meta?: string | null;
};

export type PickerGroup = { title: string; items: PickerItem[] };

const PILL =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 whitespace-nowrap transition-[transform,background-color,color,border-color] duration-150 active:scale-95";

const ICONS = {
  search: (
    <>
      <circle cx="9" cy="9" r="5.75" />
      <path d="m13.5 13.5 3.25 3.25" />
    </>
  ),
  tag: <path d="M7 3.5 5.5 16.5M14.5 3.5 13 16.5M3.5 7.5h13M3 12.5h13" />,
};

/**
 * A pill that opens a search box over a long list (institutions, sources, tags), so the
 * filter area stays short however many there are. Links are built on the server.
 */
export function SearchPicker({
  label,
  active,
  icon = "search",
  title,
  placeholder,
  groups,
  footer,
  className = "",
}: {
  label: string;
  active: boolean;
  icon?: keyof typeof ICONS;
  /** Dialog name for screen readers. */
  title: string;
  placeholder: string;
  groups: PickerGroup[];
  footer?: { href: string; label: string };
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [q, setQ] = useState("");
  const titleId = useId();

  // "#สอบครู" and "สอบครู" both find the tag.
  const needle = q.trim().replace(/^#/, "").toLowerCase();
  const shown = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        `${i.name} ${i.meta ?? ""}`.toLowerCase().includes(needle),
      ),
    }))
    .filter((g) => g.items.length > 0);
  const first = shown[0]?.items[0];

  function open() {
    setQ("");
    dialog.current?.showModal();
    input.current?.focus();
  }
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={`${PILL} ${
          active
            ? "border-brand bg-brand-soft font-medium text-brand"
            : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
        } ${className}`}
      >
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          {ICONS[icon]}
        </svg>
        <span className="max-w-[14rem] truncate">{label}</span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="size-3.5 shrink-0 opacity-70"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto mt-[8dvh] max-h-[80dvh] w-[min(34rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-card backdrop:bg-[var(--scrim)] open:flex"
      >
        <div className="flex items-center gap-2 border-b border-line p-2 pl-2">
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && first) {
                e.preventDefault();
                close();
                router.push(first.href);
              }
            }}
            aria-label={title}
            placeholder={placeholder}
            // A ring hugging the field instead of the global outline, which looked like a box in a box.
            className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-base placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={close}
            aria-label="ปิด"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
          >
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-2">
          {shown.map((g) => (
            <section key={g.title} className="py-1">
              <h3 className="px-3 pt-1 pb-1.5 text-xs font-medium text-muted">
                {g.title}
              </h3>
              <ul>
                {g.items.map((i) => (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={close}
                      aria-current={i.active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${
                        i.active
                          ? "bg-brand-soft font-medium text-brand"
                          : "hover:bg-surface-2"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{i.name}</span>
                      {i.meta && (
                        <span className="shrink-0 text-xs text-muted">
                          {i.meta}
                        </span>
                      )}
                      {i.count != null && (
                        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted tabular-nums">
                          {i.count} ประกาศ
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!first && (
            <p className="px-3 py-6 text-center text-sm text-pretty text-muted">
              ไม่พบ “{q.trim()}”
            </p>
          )}
        </div>
        {footer && (
          <Link
            href={footer.href}
            onClick={close}
            className="flex min-h-12 items-center justify-center gap-1 border-t border-line px-4 text-sm font-medium text-brand hover:bg-surface-2"
          >
            {footer.label}
          </Link>
        )}
      </dialog>
    </>
  );
}
