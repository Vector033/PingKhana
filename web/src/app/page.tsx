import { Suspense } from "react";
import { Listing, ListSkeleton, StatsStrip } from "@/components/Listing";
import { RadarShader } from "@/components/RadarShader";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7">
        {/* #9 Grainy Gradient: restrained teal tint (--brand at 6%) + SVG feTurbulence noise */}
        <div
          aria-hidden="true"
          className="radar-grain-tint pointer-events-none absolute inset-0"
        />
        {/* GPU WebGL fragment shader: DotOrbit + radar sweep masked top-right (speed=0 on reduced motion / offscreen) */}
        <RadarShader speed={0.3} />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full opacity-[0.045] mix-blend-multiply dark:opacity-[0.06] dark:mix-blend-soft-light"
        >
          <filter
            id="pingkhana-radar-noise"
            x="0"
            y="0"
            width="100%"
            height="100%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter="url(#pingkhana-radar-noise)"
          />
        </svg>

        {/* #18 Square-Dot Grid (20px, --line at 40%) + #13 Concentric Contour Lines, masked top-right */}
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
            <g stroke="var(--line-strong)" strokeOpacity="0.48" strokeWidth="1">
              <path d="M510 -10c-8 66 26 118 82 146 58 29 124 22 218-12" />
              <path d="M440 -10c-12 94 34 166 114 206 78 39 162 28 256-16" />
              <path
                d="M366 -10c-14 124 44 218 148 268 96 46 196 34 296-20"
                strokeOpacity="0.34"
              />
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
          <p className="mt-2 hidden max-w-[65ch] text-base leading-[1.6] text-balance text-muted sm:block">
            ไม่พลาดทุน สหกิจ และงานสำคัญจากเว็บมหาวิทยาลัย{" "}
            <span className="marker font-medium text-fg">
              <span className="whitespace-nowrap">เตือนก่อนปิดรับ</span>{" "}
              <span className="whitespace-nowrap">3 วัน</span>และ{" "}
              <span className="whitespace-nowrap">1 วัน</span>
            </span>{" "}
            ใน{"\u00A0"}LINE อัปเดตอัตโนมัติทุกชั่วโมง
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
