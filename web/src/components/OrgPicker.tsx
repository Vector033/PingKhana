"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

export type PickerItem = {
  name: string;
  href: string;
  active: boolean;
  /** Posts from this institution (institutions only). */
  count?: number;
  /** Institution of a source, shown beside its name. */
  org?: string | null;
};

const PILL =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 whitespace-nowrap transition-[transform,background-color,color,border-color] duration-150 active:scale-95";

/**
 * "เลือกสถาบัน / แหล่ง": a search box over every institution and source, so the filter row
 * stays one line however many universities are added. Links are built on the server.
 */
export function OrgPicker({
  orgs,
  sources,
  label,
  active,
  className = "",
}: {
  orgs: PickerItem[];
  sources: PickerItem[];
  label: string;
  active: boolean;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [q, setQ] = useState("");
  const titleId = useId();

  const needle = q.trim().toLowerCase();
  const match = (s: string) => s.toLowerCase().includes(needle);
  const shownOrgs = orgs.filter((o) => match(o.name));
  const shownSources = sources.filter((s) => match(`${s.name} ${s.org ?? ""}`));
  const first = shownOrgs[0] ?? shownSources[0];

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
          <circle cx="9" cy="9" r="5.75" />
          <path d="m13.5 13.5 3.25 3.25" />
        </svg>
        {label}
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
            เลือกสถาบันหรือแหล่งข่าว
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
            aria-label="ค้นหาสถาบันหรือแหล่งข่าว"
            placeholder="พิมพ์ชื่อมหาวิทยาลัย หรือองค์กร..."
            // A ring hugging the field instead of the global outline, which looked like a box in a box.
            className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-base placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
          {shownOrgs.length > 0 && (
            <Group title="สถาบัน / องค์กร">
              {shownOrgs.map((o) => (
                <Row key={o.href} item={o} onPick={close}>
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted tabular-nums">
                    {o.count} ประกาศ
                  </span>
                </Row>
              ))}
            </Group>
          )}
          {shownSources.length > 0 && (
            <Group title="แหล่งข่าว">
              {shownSources.map((s) => (
                <Row key={s.href} item={s} onPick={close}>
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {s.org && (
                    <span className="shrink-0 text-xs text-muted">{s.org}</span>
                  )}
                </Row>
              ))}
            </Group>
          )}
          {!first && (
            <p className="px-3 py-6 text-center text-sm text-pretty text-muted">
              ไม่พบ “{q.trim()}” ในแหล่งที่มีอยู่
            </p>
          )}
        </div>
        <Link
          href="/sources/new"
          onClick={close}
          className="flex min-h-12 items-center justify-center gap-1 border-t border-line px-4 text-sm font-medium text-brand hover:bg-surface-2"
        >
          + ไม่พบสถาบันของคุณ? เพิ่มลิงก์แหล่งข่าวใหม่
        </Link>
      </dialog>
    </>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-1">
      <h3 className="px-3 pt-1 pb-1.5 text-xs font-medium text-muted">
        {title}
      </h3>
      <ul>{children}</ul>
    </section>
  );
}

function Row({
  item,
  onPick,
  children,
}: {
  item: PickerItem;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={onPick}
        aria-current={item.active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${
          item.active
            ? "bg-brand-soft font-medium text-brand"
            : "hover:bg-surface-2"
        }`}
      >
        {children}
      </Link>
    </li>
  );
}
