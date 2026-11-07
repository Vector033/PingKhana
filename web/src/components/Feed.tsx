"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AnnouncementCard,
  CategoryChip,
  DeadlineBadge,
} from "@/components/AnnouncementCard";
import { RemindButton } from "@/components/RemindButton";
import type { Announcement } from "@/lib/api";
import { daysLeft, thDate } from "@/lib/format";

/** The list plus one quick-preview drawer. Without JS every card is a plain link to /a/[id]. */
export function Feed({
  items,
  today,
  majors,
}: {
  items: Announcement[];
  today: string;
  majors: Record<string, string>;
}) {
  const [current, setCurrent] = useState<Announcement | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (current && d && !d.open) d.showModal();
  }, [current]);

  function open(a: Announcement) {
    opener.current = document.activeElement as HTMLElement | null;
    setCurrent(a);
  }

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((a, i) => (
          <AnnouncementCard
            key={a.id}
            a={a}
            today={today}
            index={i}
            onOpen={open}
          />
        ))}
      </div>

      <dialog
        ref={dialog}
        className="drawer"
        aria-labelledby="preview-title"
        onClose={() => {
          setCurrent(null);
          opener.current?.focus();
        }}
        // A click on the backdrop lands on the <dialog> itself.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {current && (
          <Preview a={current} today={today} majors={majors} onClose={close} />
        )}
      </dialog>
    </>
  );
}

function Preview({
  a,
  today,
  majors,
  onClose,
}: {
  a: Announcement;
  today: string;
  majors: Record<string, string>;
  onClose: () => void;
}) {
  // Reminders go out 3 days and 1 day before, so a deadline today is too late to set one.
  const canRemind = a.deadline != null && daysLeft(a.deadline, today) >= 1;
  // Summaries are 2-3 lines; show each line as its own point when the model wrote several.
  const points = (a.summary_th ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <div className="flex items-start gap-3 border-b border-line px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <CategoryChip category={a.category} label={a.category_th} />
            <span className="break-words">{a.source_name}</span>
          </div>
          <h2
            id="preview-title"
            title={a.title}
            className="mt-2 line-clamp-4 text-lg leading-snug font-semibold [overflow-wrap:anywhere]"
          >
            {a.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
        >
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <section aria-labelledby="pv-sum">
          <h3 id="pv-sum" className="text-sm font-medium text-muted">
            สรุป
          </h3>
          {points.length > 1 ? (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 leading-relaxed [overflow-wrap:anywhere]">
              {points.slice(0, 3).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 leading-relaxed [overflow-wrap:anywhere]">
              {points[0] ?? "ยังไม่มีสรุป เปิดอ่านที่ประกาศต้นทาง"}
            </p>
          )}
        </section>

        <section aria-labelledby="pv-elig" className="mt-5">
          <h3 id="pv-elig" className="text-sm font-medium text-muted">
            คุณสมบัติและกำหนดการ
          </h3>
          <table className="mt-1.5 w-full text-sm">
            <tbody className="divide-y divide-line">
              <Row label="วันปิดรับ">
                {a.deadline ? (
                  <DeadlineBadge deadline={a.deadline} today={today} />
                ) : (
                  "ไม่ระบุ (ดูที่ประกาศต้นทาง)"
                )}
                {a.deadline_text && (
                  <div className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">
                    ต้นฉบับ: “{a.deadline_text}”
                  </div>
                )}
              </Row>
              <Row label="ชั้นปี">
                {a.eligible_years
                  ? a.eligible_years.map((y) => `ปี ${y}`).join(", ")
                  : "ไม่จำกัด / ไม่ระบุ"}
              </Row>
              <Row label="สาขา">
                {a.eligible_majors
                  ? a.eligible_majors.map((m) => majors[m] ?? m).join(", ")
                  : "ไม่จำกัด / ไม่ระบุ"}
              </Row>
              <Row label="GPAX ขั้นต่ำ">
                {a.min_gpax != null ? a.min_gpax.toFixed(2) : "ไม่ระบุ"}
              </Row>
              {a.published_on && (
                <Row label="ประกาศเมื่อ">{thDate(a.published_on)}</Row>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div className="space-y-2 border-t border-line bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {canRemind && <RemindButton id={a.id} className="w-full" />}
        <div className="flex gap-2 text-sm">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line-strong px-3 font-medium hover:border-brand hover:text-brand"
          >
            ประกาศต้นทาง ↗
          </a>
          <Link
            href={`/a/${a.id}`}
            onClick={onClose}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line-strong px-3 font-medium hover:border-brand hover:text-brand"
          >
            หน้าเต็ม
          </Link>
        </div>
        <p className="text-xs text-muted">
          อ่านจากเว็บอัตโนมัติ ไม่ใช่ช่องทางทางการ ตรวจที่ประกาศต้นทางก่อนสมัคร
        </p>
      </div>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <th
        scope="row"
        className="w-28 py-2.5 pr-3 text-left align-top font-normal text-muted"
      >
        {label}
      </th>
      <td className="py-2.5 align-top [overflow-wrap:anywhere]">{children}</td>
    </tr>
  );
}
