import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getMeta, getTags } from "@/lib/api";
import { getFollowed, getFollowedTags } from "@/lib/follow";
import { saveFollow } from "./actions";

export const metadata: Metadata = {
  title: "ติดตามแหล่งข่าว",
  description: "เลือกเว็บที่อยากให้ PingKhana แสดง ไม่ต้องสมัครสมาชิก",
};

export default function FollowPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        ติดตามแหล่งข่าว
      </h1>
      <p className="mt-2 text-pretty text-muted">
        เลือกเว็บที่อยากเห็น หน้าแรกและหน้าข่าวสารจะแสดงเฉพาะเว็บเหล่านี้
        จำไว้ในเบราว์เซอร์นี้ ไม่ต้องสมัครสมาชิก ส่วนใน LINE
        เลือกได้ที่เมนูตั้งค่าของบอท
      </p>
      <p className="mt-2 text-sm">
        ไม่เจอเว็บที่อยากติดตาม?{" "}
        <Link
          href="/sources/new"
          className="font-medium text-brand underline underline-offset-4"
        >
          เสนอแหล่งข่าวใหม่
        </Link>
      </p>
      <Suspense
        fallback={
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface" />
        }
      >
        <FollowForm />
      </Suspense>
    </div>
  );
}

async function FollowForm() {
  await connection();
  const [meta, followed, tags, followedTags] = await Promise.all([
    getMeta(),
    getFollowed(),
    getTags().catch(() => []),
    getFollowedTags(),
  ]);
  const myTags = new Set(followedTags);
  const packs = meta.packs ?? [];
  const chosen = new Set(followed);
  const all = followed.length === 0;

  return (
    <form action={saveFollow} className="mt-6 space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className="w-full text-sm text-muted">เลือกเร็วทั้งชุด</span>
        {packs.map((p) => (
          <button
            key={p.id}
            name="preset"
            value={p.id}
            className="inline-flex min-h-11 items-center rounded-full border border-brand bg-brand-soft px-4 text-sm font-medium text-brand active:scale-95"
          >
            {p.th}
          </button>
        ))}
      </div>

      {packs.map((p) => (
        <fieldset
          key={p.id}
          className="rounded-2xl border border-line bg-surface p-4"
        >
          <legend className="px-1 font-medium">{p.th}</legend>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {meta.sources
              .filter((s) => s.pack === p.id)
              .map((s) => (
                <label
                  key={s.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    name="source"
                    value={s.id}
                    defaultChecked={all || chosen.has(s.id)}
                    className="size-4 accent-[var(--brand)]"
                  />
                  {s.name}
                </label>
              ))}
          </div>
        </fieldset>
      ))}

      {tags.length > 0 && (
        <fieldset className="rounded-2xl border border-line bg-surface p-4">
          <legend className="px-1 font-medium">แท็กที่สนใจ</legend>
          <p className="text-sm text-muted">
            ประกาศที่มีแท็กเหล่านี้จะขึ้นเป็นแถวแยกบนหน้าแรก ไม่ว่ามาจากเว็บไหน
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.slice(0, 24).map((t) => (
              <label
                key={t.tag}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
              >
                <input
                  type="checkbox"
                  name="tag"
                  value={t.tag}
                  defaultChecked={myTags.has(t.tag)}
                  className="sr-only"
                />
                #{t.tag}
                <span className="text-xs text-muted tabular-nums">
                  {t.count}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-3">
        <button className="inline-flex min-h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-fg active:scale-[0.98]">
          บันทึก
        </button>
        {!all && (
          <button
            name="clear"
            value="1"
            className="inline-flex min-h-12 items-center rounded-xl border border-line-strong px-5 text-sm hover:border-brand hover:text-brand"
          >
            ดูทุกแหล่ง (ล้างที่เลือก)
          </button>
        )}
      </div>
    </form>
  );
}
