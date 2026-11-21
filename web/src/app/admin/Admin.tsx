"use client";

import { useCallback, useEffect, useState } from "react";
import { ModerationQueue } from "./ModerationQueue";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8100";
const KEY = "pk.adminToken";

type Overview = {
  pending_sources: number;
  announcements: number;
  extraction: Record<string, number>;
  users: number;
  reminders_set: number;
  pushes_this_month: number;
  push_monthly_limit: number;
  last_run: { started?: string; ok?: boolean; error?: string | null };
};
type Src = {
  id: string;
  name: string;
  url: string;
  pack: string;
  org: string | null;
  enabled: boolean;
  status: string;
  user_added: boolean;
  config: {
    kind: string;
    url: string;
    listing?: Record<string, string>;
    preview?: { title: string; url: string }[];
  } | null;
  submitted_at: string | null;
  note: string | null;
  last_success_at: string | null;
  last_error: string | null;
  healthy: boolean;
};

const PACK_TH: Record<string, string> = {
  student: "มหาวิทยาลัย",
  teacher: "ครู",
  career: "งาน",
  general: "ทั่วไป",
};
const fmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      }).format(new Date(iso))
    : "—";

export function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sources, setSources] = useState<Src[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    const h = { Authorization: `Bearer ${t}` };
    let o: Response, s: Response;
    try {
      [o, s] = await Promise.all([
        fetch(`${API}/api/admin/overview`, { headers: h }),
        fetch(`${API}/api/admin/sources`, { headers: h }),
      ]);
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง");
      return;
    }
    if (o.status === 401 || s.status === 401) {
      setError("รหัสไม่ถูกต้อง");
      setToken(null);
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
      return;
    }
    setError(null);
    setOverview(await o.json());
    setSources(await s.json());
  }, []);

  // The admin token lives only for this browser tab; restore it after the first paint.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(KEY);
    } catch {}
    if (saved) {
      const t = saved;
      queueMicrotask(() => {
        setToken(t);
        void load(t);
      });
    }
  }, [load]);

  async function decide(
    id: string,
    action: "approve" | "reject",
    pack?: string,
  ) {
    if (!token) return;
    await fetch(`${API}/api/admin/sources/${id}/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pack ? { pack } : {}),
    });
    await load(token);
  }

  if (!token) {
    return (
      <form
        className="mt-6 flex max-w-md flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            sessionStorage.setItem(KEY, draft);
          } catch {}
          setToken(draft);
          void load(draft);
        }}
      >
        <label htmlFor="tok" className="text-sm font-medium">
          รหัสแอดมิน (ค่า JOBS_TOKEN ใน Render)
        </label>
        <input
          id="tok"
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-11 rounded-xl border border-line-strong bg-surface px-3"
        />
        <button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-fg">
          เข้าสู่หน้าแอดมิน
        </button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    );
  }

  const pending = sources.filter((s) => s.status === "pending");
  const gem = overview?.extraction.gemini ?? 0;
  const rules = Object.entries(overview?.extraction ?? {})
    .filter(([k]) => k !== "gemini")
    .reduce((n, [, v]) => n + v, 0);

  return (
    <div className="mt-6 space-y-8">
      {overview && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="รอตรวจ"
            value={overview.pending_sources}
            warn={overview.pending_sources > 0}
          />
          <Stat
            label="ประกาศ"
            value={overview.announcements}
            hint={`Gemini ${gem} · กฎ ${rules}`}
          />
          <Stat
            label="ผู้ใช้ LINE"
            value={overview.users}
            hint={`ตั้งเตือน ${overview.reminders_set}`}
          />
          <Stat
            label="push เดือนนี้"
            value={`${overview.pushes_this_month}/${overview.push_monthly_limit}`}
            warn={
              overview.pushes_this_month > overview.push_monthly_limit * 0.8
            }
            hint={
              overview.last_run.started
                ? `รอบล่าสุด ${fmt(overview.last_run.started)} ${overview.last_run.ok ? "สำเร็จ" : "ล้มเหลว"}`
                : "ยังไม่มีรอบตั้งแต่เปิดเครื่อง"
            }
          />
        </dl>
      )}

      <ModerationQueue token={token} />

      <section aria-labelledby="pending-h">
        <h2 id="pending-h" className="text-xl font-semibold">
          แหล่งที่รอตรวจ ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="mt-2 text-sm text-muted">ไม่มีรายการรอตรวจ</p>
        )}
        <ul className="mt-3 space-y-3">
          {pending.map((s) => (
            <li
              key={s.id}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-pretty">
                  {s.name}
                  {s.org && (
                    <span className="ml-2 text-sm font-normal text-muted">
                      {s.org}
                    </span>
                  )}
                </p>
                <span className="text-xs whitespace-nowrap text-muted tabular-nums">
                  ส่งเมื่อ {fmt(s.submitted_at)}
                </span>
              </div>
              <p className="mt-1 text-sm break-all text-muted">
                {s.config?.kind === "rss" ? "RSS" : "หน้าเว็บ (AI selector)"} ·{" "}
                <a
                  className="underline"
                  href={s.config?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.config?.url}
                </a>
              </p>
              {s.config?.listing && (
                <code className="mt-1 block text-xs text-muted">
                  {JSON.stringify(s.config.listing)}
                </code>
              )}
              {s.note && <p className="mt-1 text-sm">โน้ต: {s.note}</p>}
              <ol className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                {s.config?.preview?.map((p) => (
                  <li key={p.url}>{p.title}</li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["student", "teacher", "career", "general"] as const).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => decide(s.id, "approve", p)}
                      className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium ${p === s.pack ? "bg-brand text-brand-fg" : "border border-line-strong hover:border-brand"}`}
                    >
                      อนุมัติ · {PACK_TH[p]}
                    </button>
                  ),
                )}
                <button
                  onClick={() => decide(s.id, "reject")}
                  className="inline-flex min-h-11 items-center rounded-xl border border-danger/50 px-4 text-sm text-danger"
                >
                  ปฏิเสธ
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="all-h">
        <h2 id="all-h" className="text-xl font-semibold">
          ทุกแหล่ง
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line whitespace-nowrap text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">ชื่อ</th>
                <th className="px-3 py-2 font-medium">กลุ่ม</th>
                <th className="px-3 py-2 font-medium">สถานะ</th>
                <th className="px-3 py-2 font-medium">ดึงสำเร็จล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="min-w-[12rem] px-3 py-2 text-pretty">
                    {s.name}
                    {s.user_added && (
                      <span className="ml-1 text-xs whitespace-nowrap text-muted">
                        (ผู้ใช้เสนอ)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">
                    {PACK_TH[s.pack] ?? s.pack}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {!s.enabled ? (
                      <span className="text-muted">
                        {s.status === "rejected"
                          ? "ปฏิเสธ"
                          : s.status === "pending"
                            ? "รอตรวจ"
                            : "ปิดอยู่"}
                        {s.note && !s.user_added && (
                          <span className="mt-0.5 block text-xs whitespace-normal">
                            {s.note}
                          </span>
                        )}
                      </span>
                    ) : s.healthy ? (
                      <span className="text-brand">ปกติ</span>
                    ) : (
                      <span
                        className="text-danger"
                        title={s.last_error ?? undefined}
                      >
                        ดึงไม่สำเร็จ
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted tabular-nums">
                    {fmt(s.last_success_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: number | string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${warn ? "border-danger/40 bg-danger-soft" : "border-line bg-surface"}`}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted">{hint}</dd>}
    </div>
  );
}
