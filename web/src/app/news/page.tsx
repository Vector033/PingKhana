import type { Metadata } from "next";
import { Suspense } from "react";
import { Listing, ListSkeleton } from "@/components/Listing";

export const metadata: Metadata = {
  title: "ข่าวสาร",
  description:
    "ข่าวประชาสัมพันธ์จากมหาวิทยาลัยเชียงใหม่ กระทรวงศึกษาธิการ สพฐ. และคุรุสภา รวมไว้ในที่เดียว",
};

export default function NewsPage({ searchParams }: PageProps<"/news">) {
  return (
    <>
      <section className="mb-6">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
          ข่าวสาร
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted">
          ข่าวที่ไม่มีวันปิดรับ เช่น ข่าวกิจกรรม ผลงาน และประกาศทั่วไป
          แยกไว้ตรงนี้ หน้าแรกจะได้เหลือแต่สิ่งที่ต้องสมัคร
        </p>
      </section>
      <Suspense fallback={<ListSkeleton />}>
        <Listing searchParams={searchParams} zone="news" />
      </Suspense>
    </>
  );
}
