import type { Metadata } from "next";
import { Admin } from "./Admin";

export const metadata: Metadata = {
  title: "แอดมิน",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        แอดมิน
      </h1>
      <p className="mt-2 text-pretty text-muted">
        ตรวจแหล่งข่าวที่ผู้ใช้เสนอ ดูสุขภาพของแต่ละแหล่ง และโควตา{"\u00A0"}LINE
      </p>
      <Admin />
    </div>
  );
}
