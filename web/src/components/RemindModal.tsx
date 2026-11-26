"use client";

import { useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { qrSvgPath } from "@/lib/qr";

function isMobileOrLineBrowser(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  if (/Line\/|Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function RemindTrigger({
  id,
  href,
  className = "",
  icon,
  timeline,
}: {
  id: number;
  href: string;
  className?: string;
  icon: React.ReactNode;
  timeline: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const titleId = useId();
  const [copied, setCopied] = useState(false);

  const command = `เตือน ${id}`;
  const botHandle = useMemo(() => {
    try {
      return decodeURIComponent(href).match(/@[\w.-]+/)?.[0] ?? "@524osura";
    } catch {
      return "@524osura";
    }
  }, [href]);
  const qr = useMemo(() => qrSvgPath(href, 2), [href]);

  function openModal() {
    setCopied(false);
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();
    d.querySelector<HTMLElement>("[data-qr-close]")?.focus();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function handleTriggerClick(e: MouseEvent<HTMLAnchorElement>) {
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0 ||
      isMobileOrLineBrowser()
    ) {
      return;
    }
    e.preventDefault();
    openModal();
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for restricted clipboard contexts.
      const input = document.createElement("input");
      input.value = command;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <>
      <a
        ref={triggerRef}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleTriggerClick}
        className={`bell-trigger inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-line-green px-5 font-semibold text-line-green-fg shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-105 active:scale-[0.98] motion-safe:hover:-translate-y-0.5 ${className}`}
      >
        {icon}
        ให้ LINE เตือนก่อนปิดรับ
      </a>

      <dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClose={(e) => {
          e.stopPropagation();
          if (triggerRef.current?.isConnected) triggerRef.current.focus();
        }}
        onCancel={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget) closeModal();
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-card backdrop:bg-[var(--scrim)] backdrop:backdrop-blur-sm open:flex"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3
              id={titleId}
              className="text-base leading-[1.3] font-semibold tracking-tight text-balance"
            >
              ตั้งเตือนใน LINE
            </h3>
            <p className="mt-0.5 text-xs text-pretty text-muted">
              สแกนด้วยมือถือเพื่อเปิดแชท PingKhana พร้อมคำสั่งอัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            data-qr-close
            onClick={closeModal}
            aria-label="ปิดหน้าต่าง QR"
            className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
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

        <div className="space-y-4 p-5">
          <div className="mx-auto w-fit rounded-2xl border border-line bg-white p-3.5 shadow-sm">
            <svg
              role="img"
              aria-label={`QR code สำหรับ ${command} ใน LINE`}
              viewBox={`0 0 ${qr.viewBoxSize} ${qr.viewBoxSize}`}
              shapeRendering="crispEdges"
              className="size-44 text-slate-950"
            >
              <rect width={qr.viewBoxSize} height={qr.viewBoxSize} fill="#ffffff" />
              <path d={qr.path} fill="currentColor" />
            </svg>
          </div>

          <div className="rounded-xl border border-line bg-surface-2/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted">
                  หรือส่งข้อความนี้ให้บอท {botHandle}
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-fg tabular-nums">
                  {command}
                </p>
              </div>
              <button
                type="button"
                onClick={copyCommand}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-xs font-medium text-fg transition-colors hover:border-brand hover:text-brand active:scale-95"
              >
                {copied ? (
                  <>
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="size-4 text-brand"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                    </svg>
                    คัดลอกแล้ว
                  </>
                ) : (
                  <>
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="7" y="7" width="9.5" height="9.5" rx="2" />
                      <path d="M5 13H4.5A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5V5" />
                    </svg>
                    คัดลอกคำสั่ง
                  </>
                )}
              </button>
            </div>
          </div>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-line-green px-4 text-sm font-semibold text-line-green-fg shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
          >
            เปิดใน LINE ↗
          </a>

          {timeline}
        </div>
      </dialog>
    </>
  );
}
