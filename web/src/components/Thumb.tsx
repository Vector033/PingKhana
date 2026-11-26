"use client";

import Image from "next/image";
import { useState } from "react";
import { CATEGORY_TINT } from "@/lib/format";
import { optimizable } from "@/lib/imageHosts";

function isValidImageSrc(src?: string | null): src is string {
  if (!src) return false;
  const trimmed = src.trim();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/")
  );
}

const EMERALD_RADAR_COVER =
  "from-emerald-100 via-teal-50 to-emerald-200 text-emerald-800 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-900 dark:text-emerald-300";

/**
 * The announcement's poster from the source site, or — when there is none or it fails to load —
 * a radar card cover (emerald radar fallback on broken external URLs), so missing images never look broken.
 */
export function Thumb({
  src,
  category,
  label,
  sizes,
  eager = false,
  className = "",
}: {
  src?: string | null;
  category: string;
  label: string;
  sizes: string;
  /** Above the fold: load now at high priority instead of lazily (the LCP poster). */
  eager?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const validSrc = isValidImageSrc(src) ? src.trim() : null;
  const failed = Boolean(validSrc) && failedSrc === validSrc;
  const show = Boolean(validSrc) && !failed;
  const fallbackTone = failed
    ? EMERALD_RADAR_COVER
    : (CATEGORY_TINT[category] ?? CATEGORY_TINT.general);

  return (
    <div
      className={`relative overflow-hidden bg-surface-2 after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-black/10 dark:after:ring-white/10 ${className}`}
    >
      {show ? (
        <>
          <Image
            key={validSrc}
            src={validSrc!}
            alt=""
            fill
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            // A host we have not listed (e.g. a newly added source) loads directly instead of
            // crashing the page on next/image's host check.
            unoptimized={!optimizable(validSrc!)}
            onError={() => setFailedSrc(validSrc)}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth === 0) setFailedSrc(validSrc);
            }}
            className="object-cover object-top transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent"
          />
        </>
      ) : (
        <div
          aria-hidden
          className={`absolute inset-0 grid place-items-center bg-gradient-to-br ${fallbackTone}`}
        >
          <svg
            viewBox="0 0 120 120"
            className="absolute -right-6 -bottom-8 size-40 opacity-25"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="60" cy="60" r="12" fill="currentColor" stroke="none" />
            <circle cx="60" cy="60" r="28" />
            <circle cx="60" cy="60" r="44" opacity=".7" />
            <circle cx="60" cy="60" r="58" opacity=".4" />
            <path d="M48 60h24M60 48v24" strokeWidth="1.5" opacity=".6" />
          </svg>
          <span className="relative text-lg font-semibold tracking-tight opacity-85">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

/** Wraps each case-insensitive occurrence of `q` in a <mark>. */
export function Highlight({ text, q }: { text: string; q?: string }) {
  const needle = q?.trim();
  if (!needle) return <>{text}</>;
  const lower = text.replaceAll("\u00A0", " ").toLowerCase();
  const n = needle.replaceAll("\u00A0", " ").toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  for (let at = lower.indexOf(n); at !== -1; at = lower.indexOf(n, i)) {
    if (at > i) parts.push(text.slice(i, at));
    parts.push(
      <mark
        key={k++}
        className="rounded-sm bg-[var(--mark)] px-0.5 text-inherit"
      >
        {text.slice(at, at + n.length)}
      </mark>,
    );
    i = at + n.length;
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}
