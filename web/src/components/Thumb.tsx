"use client";

import Image from "next/image";
import { useState } from "react";
import { CATEGORY_TINT } from "@/lib/format";
import { optimizable } from "@/lib/imageHosts";

/**
 * The announcement's poster from the source site, or — when there is none or it fails to load —
 * a block in the category's colour with radar rings, so missing images never look broken.
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
  const [failed, setFailed] = useState(false);
  const show = Boolean(src) && !failed;
  return (
    <div
      className={`relative overflow-hidden bg-surface-2 after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-black/10 dark:after:ring-white/10 ${className}`}
    >
      {show ? (
        <>
          <Image
            src={src!}
            alt=""
            fill
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            // A host we have not listed (e.g. a newly added source) loads directly instead of
            // crashing the page on next/image's host check.
            unoptimized={!optimizable(src!)}
            onError={() => setFailed(true)}
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
          className={`absolute inset-0 grid place-items-center bg-gradient-to-br ${CATEGORY_TINT[category] ?? CATEGORY_TINT.general}`}
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
          </svg>
          <span className="relative text-lg font-semibold tracking-tight opacity-80">
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
