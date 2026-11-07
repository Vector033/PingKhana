import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Link from "next/link";
import { DISCLAIMER } from "@/lib/format";
import "./globals.css";

const plex = IBM_Plex_Sans_Thai({
  variable: "--font-plex",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "PingKhana — ประกาศทุน สหกิจ งาน มช.",
    template: "%s · PingKhana",
  },
  description:
    "รวมประกาศทุน สหกิจ/ฝึกงาน งาน และกิจกรรมจากเว็บคณะและมหาวิทยาลัยเชียงใหม่ ค้นหา กรอง และให้ LINE เตือนก่อนปิดรับ",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/85 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-1.5">
            <Link
              href="/"
              className="-ml-1 flex min-h-11 items-center gap-2 px-1 font-semibold tracking-tight"
            >
              {/* A radar ping: the site watches faculty pages and pings you. */}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="size-6 text-brand"
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
            <div className="ml-auto flex items-center text-sm text-muted">
              <Link
                href="/?status=closing&sort=deadline"
                className="inline-flex min-h-11 items-center px-2.5 hover:text-fg"
              >
                ใกล้ปิดรับ
              </Link>
              <Link
                href="/sources"
                className="inline-flex min-h-11 items-center px-2.5 hover:text-fg"
              >
                แหล่งข้อมูล
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs leading-relaxed text-muted">
            <p>{DISCLAIMER}</p>
            <p className="mt-1">
              โปรเจกต์นักศึกษา · โค้ด{" "}
              <a
                className="underline underline-offset-2 hover:text-fg"
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
