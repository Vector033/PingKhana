import { Suspense } from "react";
import { Listing, ListSkeleton, StatsStrip } from "@/components/Listing";
import { RadarShader } from "@/components/RadarShader";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7">
        {/* Three layers, each one earning its place: a teal tint for depth, the shader for the
            moving sweep, and dots + rings so the radar still reads with motion or WebGL off. */}
        <div
          aria-hidden="true"
          className="radar-grain-tint pointer-events-none absolute inset-0"
        />
        <RadarShader speed={0.3} />
        <div
          aria-hidden="true"
          className="radar-dot-grid radar-mask-tr pointer-events-none absolute inset-0"
        >
          <svg
            viewBox="0 0 800 320"
            preserveAspectRatio="xMaxYMin slice"
            className="size-full"
            fill="none"
          >
            <g stroke="var(--brand)" strokeOpacity="0.16" strokeWidth="1">
              <circle cx="710" cy="48" r="44" />
              <circle cx="710" cy="48" r="92" strokeDasharray="3 5" />
              <circle cx="710" cy="48" r="144" />
              <circle cx="710" cy="48" r="204" strokeDasharray="2 6" />
              <circle cx="710" cy="48" r="272" strokeOpacity="0.12" />
              <circle cx="710" cy="48" r="348" strokeOpacity="0.09" />
            </g>
            <g stroke="var(--brand)" strokeOpacity="0.24" strokeWidth="1">
              <path d="M694 48h32M710 32v32" />
              <circle
                cx="710"
                cy="48"
                r="3.5"
                fill="var(--brand)"
                fillOpacity="0.28"
                stroke="none"
              />
            </g>
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="max-w-3xl text-2xl leading-[1.3] font-semibold tracking-[-0.02em] text-balance sm:text-3xl">
            ทุน สหกิจ งาน และกิจกรรมที่เปิดรับ ในที่เดียว
          </h1>
          {/* Phones get the one line that matters (the LINE reminder); wider screens the full sentence. */}
          <p className="mt-2 max-w-[65ch] text-sm leading-[1.6] text-balance text-muted sm:text-base">
            <span className="hidden sm:inline">
              ไม่พลาดทุน สหกิจ และงานสำคัญจากเว็บมหาวิทยาลัย{" "}
            </span>
            <span className="marker font-medium text-fg">
              <span className="whitespace-nowrap">เตือนก่อนปิดรับ</span>{" "}
              <span className="whitespace-nowrap">3 วัน</span>และ{" "}
              <span className="whitespace-nowrap">1 วัน</span>
            </span>{" "}
            ใน{"\u00A0"}LINE
            <span className="hidden sm:inline"> อัปเดตอัตโนมัติทุกชั่วโมง</span>
          </p>
          <Suspense fallback={<div className="mt-4 h-9" />}>
            <StatsStrip />
          </Suspense>
        </div>
      </section>
      <Suspense fallback={<ListSkeleton />}>
        <Listing searchParams={searchParams} zone="open" />
      </Suspense>
    </>
  );
}
