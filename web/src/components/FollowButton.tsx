"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toggleFollow } from "@/app/follow/actions";

/**
 * Bookmark beside a source name: follow or unfollow that source without leaving the page.
 * The cookie changes on the server, so the list re-renders with the new choice.
 */
export function FollowButton({
  id,
  name,
  following,
  className = "",
}: {
  id: string;
  name: string;
  following: boolean;
  className?: string;
}) {
  const [on, setOn] = useOptimistic(following);
  const [, start] = useTransition();
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  function click() {
    start(async () => {
      setOn(!on);
      const now = await toggleFollow(id);
      setToast(now ? `กำลังติดตาม ${name}` : `เลิกติดตาม ${name} แล้ว`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={click}
        aria-pressed={on}
        aria-label={on ? `เลิกติดตาม ${name}` : `ติดตาม ${name}`}
        title={on ? "เลิกติดตามแหล่งนี้" : "ติดตามแหล่งนี้"}
        // Above the card's stretched title link (z-10), so it is its own click target.
        className={`relative z-20 grid size-11 shrink-0 place-items-center rounded-full transition-[color,background-color,transform] duration-150 hover:bg-surface-2 active:scale-90 ${
          on ? "text-brand" : "text-muted hover:text-fg"
        } ${className}`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        >
          <path d="M6.5 3.5h11a1 1 0 0 1 1 1V20l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1Z" />
        </svg>
      </button>
      <span role="status" className="sr-only">
        {toast}
      </span>
      {/* Cards transform on hover and clip, so the visible toast lives on <body>. Only set
          after a click, so this never runs during server rendering. */}
      {toast &&
        createPortal(
          <p
            aria-hidden
            className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto w-fit max-w-md rounded-full bg-fg px-4 py-2.5 text-center text-sm font-medium text-pretty text-bg shadow-card"
          >
            {toast}
          </p>,
          document.body,
        )}
    </>
  );
}
