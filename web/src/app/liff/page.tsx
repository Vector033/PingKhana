import type { Metadata } from "next";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "ตั้งค่าการแจ้งเตือน" };

export default function LiffPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">
        ตั้งค่าการแจ้งเตือน
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        เลือกสิ่งที่อยากรู้ แล้ว PingKhana จะส่งเฉพาะประกาศที่ตรงกับคุณ
      </p>
      <SettingsForm />
    </div>
  );
}
