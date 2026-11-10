import type { Metadata } from "next";
import { AddSource } from "./AddSource";

export const metadata: Metadata = {
  title: "เสนอแหล่งข่าวใหม่",
  description: "วางลิงก์เว็บที่อยากให้ PingKhana ติดตาม ระบบจะหาข่าวให้เอง",
};

export default function NewSourcePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        เสนอแหล่งข่าวใหม่
      </h1>
      <p className="mt-2 text-pretty text-muted">
        วางลิงก์เว็บอะไรก็ได้ เช่น เว็บโรงเรียน เขตพื้นที่การศึกษา หรือคณะ
        ระบบจะหาข่าวในเว็บนั้นให้เอง ไม่ต้องรู้จัก{"\u00A0"}RSS
        แอดมินจะตรวจก่อนเปิดให้ทุกคนเห็น
      </p>
      <AddSource />
      <p className="mt-8 text-xs leading-relaxed text-pretty text-muted">
        PingKhana อ่านเฉพาะหน้าเว็บสาธารณะ เคารพ{" "}
        <span className="whitespace-nowrap">robots.txt</span> ของแต่ละเว็บ
        และไม่อ่านหน้าที่ต้องล็อกอิน
        เว็บที่ปิดกั้นการเข้าจากต่างประเทศจะติดตามไม่ได้
        เพราะเซิร์ฟเวอร์อยู่สิงคโปร์
      </p>
    </div>
  );
}
