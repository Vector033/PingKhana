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
        <header className="border-b border-line bg-surface/80 backdrop-blur sticky top-0 z-10">
          <nav className="mx-auto flex max-w-5xl items-center gap-5 px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-lg bg-brand text-white text-sm"
              >
                P
              </span>
              PingKhana
            </Link>
            <div className="ml-auto flex items-center gap-4 text-sm text-muted">
              <Link
                href="/?status=closing&sort=deadline"
                className="hover:text-fg"
              >
                ใกล้ปิดรับ
              </Link>
              <Link href="/sources" className="hover:text-fg">
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
                className="underline"
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
