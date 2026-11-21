"use client";

import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8100";

type Post = {
  id: number;
  title: string;
  url: string;
  image_url: string | null;
  source_name: string;
  summary_th: string | null;
  body: string;
  post_intent: string | null;
  rejection_reason: string | null;
  first_seen_at: string;
};

const TABS = [
  { id: "pending_review", th: "รอการตรวจสอบ" },
  { id: "filtered_out", th: "คัดออกแล้ว" },
] as const;

const INTENT_TH: Record<string, string> = {
  official_announcement: "ประกาศจากหน่วยงาน",
  hiring_post: "รับสมัครงาน",
  job_seeker: "คนหางาน",
  spam_or_scam: "สแปม / หลอกลวง",
  discussion: "พูดคุย / รีวิว",
  irrelevant: "ไม่เกี่ยวข้อง",
};

/** Social posts the gate held back or dropped: an admin publishes or rejects each one. */
export function ModerationQueue({ token }: { token: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pending_review");
  const [posts, setPosts] = useState<Post[] | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`${API}/api/admin/moderation?status=${tab}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    setPosts(r?.ok ? await r.json() : []);
  }, [tab, token]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function act(id: number, action: "approve" | "reject") {
    await fetch(`${API}/api/admin/moderation/${id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  return (
    <section aria-labelledby="mod-h">
      <h2 id="mod-h" className="text-xl font-semibold">
        โพสต์จากโซเชียล
      </h2>
      <p className="mt-1 text-sm text-pretty text-muted">
        โพสต์จากเพจ Facebook / Instagram ผ่านด่านคัดกรองสองชั้น อันที่ AI
        ไม่แน่ใจรอให้ตัดสินที่นี่
      </p>
      <div role="tablist" className="mt-3 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${
              tab === t.id
                ? "border-brand bg-brand-soft font-medium text-brand"
                : "border-line text-muted hover:text-fg"
            }`}
          >
            {t.th}
          </button>
        ))}
      </div>
      {posts === null ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
      ) : posts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          ไม่มีโพสต์ในรายการนี้
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex gap-3 rounded-xl border border-line bg-surface p-4"
            >
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element -- any host, admin only
                <img
                  src={p.image_url}
                  alt=""
                  className="size-20 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-pretty [overflow-wrap:anywhere]">
                  {p.title}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {p.source_name}
                  {p.post_intent && (
                    <> · {INTENT_TH[p.post_intent] ?? p.post_intent}</>
                  )}
                </p>
                {p.rejection_reason && (
                  <p className="mt-1 text-sm text-pretty text-muted">
                    เหตุผล: {p.rejection_reason}
                  </p>
                )}
                <p className="mt-2 line-clamp-3 text-sm text-pretty [overflow-wrap:anywhere]">
                  {p.summary_th || p.body}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tab === "pending_review" ? (
                    <>
                      <button
                        onClick={() => act(p.id, "approve")}
                        className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-medium text-brand-fg"
                      >
                        อนุมัติขึ้นเว็บ
                      </button>
                      <button
                        onClick={() => act(p.id, "reject")}
                        className="inline-flex min-h-11 items-center rounded-xl border border-danger/50 px-4 text-sm text-danger"
                      >
                        ปฏิเสธ
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => act(p.id, "approve")}
                      className="inline-flex min-h-11 items-center rounded-xl border border-line-strong px-4 text-sm hover:border-brand"
                    >
                      กู้คืนขึ้นเว็บ
                    </button>
                  )}
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center px-2 text-sm text-brand hover:underline"
                  >
                    โพสต์ต้นทาง ↗
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
