import type { Metadata } from "next";
import { AccountPanel } from "./AccountPanel";

export const metadata: Metadata = {
  title: "บัญชี",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        บัญชี
      </h1>
      <p className="mt-2 text-balance text-muted">
        ไม่ต้องล็อกอินก็ใช้ได้ทุกอย่าง ล็อกอินด้วย{"\u00A0"}Google
        เมื่ออยากให้แหล่งข่าวที่ติดตามตรงกันทุกเครื่อง และผูกกับ{"\u00A0"}LINE
      </p>
      <AccountPanel />
    </div>
  );
}
