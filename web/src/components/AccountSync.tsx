"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GOOGLE_CLIENT_ID, getToken, syncFollows } from "@/lib/account";

/**
 * Header account link (only when sign-in is set up). While signed in, follows changed on
 * /follow are pushed to the account on the next page.
 */
export function AccountLink() {
  const path = usePathname();
  useEffect(() => {
    if (GOOGLE_CLIENT_ID && getToken()) void syncFollows().catch(() => {});
  }, [path]);
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <Link
      href="/account"
      aria-label="บัญชี"
      className="grid size-11 place-items-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <circle cx="10" cy="7" r="3.25" />
        <path
          d="M3.75 16.5c.9-3 3.4-4.5 6.25-4.5s5.35 1.5 6.25 4.5"
          strokeLinecap="round"
        />
      </svg>
    </Link>
  );
}
