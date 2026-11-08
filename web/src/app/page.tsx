import { Suspense } from "react";
import { Listing, ListSkeleton, StatsStrip } from "@/components/Listing";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="mb-6 sm:mb-8">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
          ทุน สหกิจ งาน และกิจกรรมที่เปิดรับ ในที่เดียว
        </h1>
        <p className="mt-2 hidden max-w-2xl text-pretty text-muted sm:block">
          ดึงจากเว็บมหาวิทยาลัยและหน่วยงานการศึกษาทุกชั่วโมง สรุปสั้นๆ
          พร้อมวันปิดรับ กดประกาศที่สนใจแล้วให้ LINE เตือนก่อนปิดรับ 3 วันและ 1
          วัน
        </p>
        <Suspense fallback={<div className="mt-4 h-9" />}>
          <StatsStrip />
        </Suspense>
      </section>
      <Suspense fallback={<ListSkeleton />}>
        <Listing searchParams={searchParams} zone="open" />
      </Suspense>
    </>
  );
}
