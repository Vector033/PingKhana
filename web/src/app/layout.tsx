import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AccountLink } from "@/components/AccountSync";
import { CategoryTabs, HeaderSearch, ThemeToggle } from "@/components/TopNav";
import { DISCLAIMER } from "@/lib/format";
import "./globals.css";

const plex = IBM_Plex_Sans_Thai({
  variable: "--font-plex",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://pingkhana.vercel.app",
  ),
  openGraph: { siteName: "PingKhana", locale: "th_TH", images: ["/og.png"] },
  title: {
    default: "PingKhana — ประกาศทุน สหกิจ งาน และข่าวการศึกษา",
    template: "%s · PingKhana",
  },
  description:
    "รวมประกาศทุน สหกิจ/ฝึกงาน งาน กิจกรรม และข่าวการศึกษาจากเว็บมหาวิทยาลัยและหน่วยงาน ค้นหา กรองตามสถาบัน และให้ LINE เตือนก่อนปิดรับ",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("pingkhana.theme");var r=document.documentElement;if(t==="dark"){r.classList.add("dark");r.classList.remove("light");}else if(t==="light"){r.classList.add("light");r.classList.remove("dark");}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${plex.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="fluted-glass z-20 border-b border-line/75 bg-bg/80 px-3 pt-3 backdrop-blur-md md:sticky md:top-0 md:px-4">
          <div className="mx-auto max-w-6xl">
            <div className="bar flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl px-3 py-2 shadow-card sm:gap-x-4 sm:px-4">
              <Link
                href="/"
                className="-ml-1 flex min-h-11 shrink-0 items-center gap-2 px-1 text-lg font-semibold tracking-tight"
              >
                {/* A radar ping: the site watches faculty pages and pings you. */}
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-6 text-teal-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="2.2"
                    fill="currentColor"
                    stroke="none"
                  />
                  <path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
                  <path
                    d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2"
                    opacity=".5"
                  />
                </svg>
                PingKhana
              </Link>
              <Suspense
                fallback={
                  <div className="order-last h-11 w-full md:order-none md:max-w-md md:flex-1" />
                }
              >
                <HeaderSearch className="order-last w-full md:order-none md:max-w-md md:flex-1" />
              </Suspense>
              <div className="ml-auto flex items-center text-sm text-white/75">
                <Link
                  href="/follow"
                  className="inline-flex min-h-11 items-center px-2 whitespace-nowrap hover:text-white sm:px-2.5"
                >
                  ติดตาม
                </Link>
                <Link
                  href="/sources"
                  className="inline-flex min-h-11 items-center px-2 whitespace-nowrap hover:text-white sm:px-2.5"
                >
                  แหล่งข้อมูล
                </Link>
                <Suspense fallback={null}>
                  <AccountLink />
                </Suspense>
                <ThemeToggle />
              </div>
            </div>
            <div className="mt-1 px-1">
              <Suspense fallback={<div className="h-11" />}>
                <CategoryTabs />
              </Suspense>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted">
            <p className="text-balance">{DISCLAIMER}</p>
            <p className="mt-1 text-pretty">
              โปรเจกต์นักศึกษา · โค้ด{" "}
              <a
                className="whitespace-nowrap underline underline-offset-2 hover:text-fg"
                href="https://github.com/Vector033/PingKhana"
              >
                github.com/Vector033/PingKhana
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
