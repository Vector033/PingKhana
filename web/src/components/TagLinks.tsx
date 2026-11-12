import Link from "next/link";
import type { Announcement } from "@/lib/api";

/** "#tag" links to every post with that tag (news tags open /news). */
export function TagLinks({ a }: { a: Announcement }) {
  if (!a.tags?.length) return null;
  const base = a.category === "general" ? "/news" : "/";
  return (
    <ul aria-label="แท็ก" className="flex flex-wrap gap-1.5">
      {a.tags.map((t) => (
        <li key={t}>
          <Link
            href={`${base}?tag=${encodeURIComponent(t)}`}
            className="inline-flex min-h-11 items-center rounded-full bg-surface-2 px-3 text-sm text-muted hover:text-brand"
          >
            #{t}
          </Link>
        </li>
      ))}
    </ul>
  );
}
