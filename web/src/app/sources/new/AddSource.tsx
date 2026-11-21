"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8100";

type Preview = {
  title: string;
  url: string;
  published_on: string | null;
  image: string | null;
};
type Found = {
  kind: "rss" | "html";
  url: string;
  homepage: string;
  name: string;
  pack: string;
  /** Institution guessed from a known source on the same site, e.g. "มช.". */
  org: string | null;
  method: string;
  listing: Record<string, string> | null;
  preview: Preview[];
  existing: {
    id: string;
    name: string;
    status: string;
    enabled: boolean;
  } | null;
};

const PACKS = [
  { id: "student", th: "มหาวิทยาลัย" },
  { id: "teacher", th: "ครู / การศึกษา" },
  { id: "career", th: "งาน / อาชีพ" },
  { id: "general", th: "ทั่วไป" },
];

const HOW: Record<string, string> = {
  feed: "ลิงก์นี้เป็น RSS อยู่แล้ว",
  "feed-autodiscovery": "เจอ RSS ของเว็บนี้ให้แล้ว",
  "gemini-selectors": "เว็บนี้ไม่มี RSS ให้ AI อ่านโครงหน้าเว็บแทน",
};

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body.detail === "string"
      ? body.detail
      : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
  } catch {
    return "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
  }
}

export function AddSource() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [name, setName] = useState("");
  const [pack, setPack] = useState("general");
  const [org, setOrg] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<"pending" | "exists" | null>(null);

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFound(null);
    setSent(null);
    try {
      const res = await fetch(`${API}/api/sources/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const f: Found = await res.json();
      setFound(f);
      setName(f.name);
      setPack(f.pack);
      setOrg(f.org ?? "");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้งในอีกสักครู่"
          : err instanceof Error
            ? err.message
            : String(err),
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!found) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`${API}/api/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...found,
        name,
        pack,
        org: org.trim() || null,
        note: note || null,
      }),
    });
    setBusy(false);
    if (!res.ok) return setError(await readError(res));
    setSent((await res.json()).status);
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={find} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="src-url" className="sr-only">
          ลิงก์เว็บ
        </label>
        <input
          id="src-url"
          type="text"
          inputMode="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="เช่น obec.go.th หรือลิงก์หน้ารวมข่าวของโรงเรียน"
          className="min-h-12 flex-1 rounded-xl border border-line-strong bg-surface px-4 text-base outline-none focus:border-brand focus:ring-4 focus:ring-[var(--brand-ring)]"
        />
        <button
          disabled={busy}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold whitespace-nowrap text-brand-fg disabled:opacity-60"
        >
          {busy && !found ? "กำลังดูเว็บ…" : "ค้นหาข่าวจากเว็บนี้"}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-pretty text-danger"
        >
          {error}
        </p>
      )}

      {found && !sent && (
        <section
          aria-label="ผลที่เจอ"
          className="space-y-4 rounded-2xl border border-line bg-surface p-5"
        >
          <p className="text-sm text-pretty text-muted">
            {HOW[found.method] ?? ""}
          </p>
          {found.existing ? (
            <p className="text-sm text-pretty">
              มีเว็บนี้ในระบบแล้ว: <b>{found.existing.name}</b>
              {found.existing.status === "pending" ? " (รอแอดมินตรวจ)" : ""}
            </p>
          ) : null}
          <div>
            <h2 className="font-medium">ข่าวล่าสุดที่อ่านได้</h2>
            <ol className="mt-2 space-y-1.5 text-sm">
              {found.preview.map((p) => (
                <li key={p.url} className="flex gap-2">
                  <span aria-hidden className="text-muted">
                    •
                  </span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand hover:underline"
                  >
                    {p.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
          {!found.existing && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">ชื่อแหล่งข่าว</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-bg px-3"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">เหมาะกับ</span>
                  <select
                    value={pack}
                    onChange={(e) => setPack(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-bg px-3"
                  >
                    {PACKS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.th}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="font-medium">
                  มหาวิทยาลัย / หน่วยงาน (ไม่บังคับ)
                </span>
                <input
                  value={org}
                  maxLength={80}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="เช่น มช., จุฬาฯ, สพฐ."
                  className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-bg px-3"
                />
                <span className="mt-1 block text-xs text-pretty text-muted">
                  ใช้จัดกลุ่มในช่อง “เลือกสถาบัน” แหล่งจากที่เดียวกันจะอยู่ด้วยกัน
                </span>
              </label>
              <label className="block text-sm">
                <span className="font-medium">ฝากบอกแอดมิน (ไม่บังคับ)</span>
                <input
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น เว็บประกาศของ สพป. เขต 1"
                  className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-bg px-3"
                />
              </label>
              <button
                type="button"
                onClick={submit}
                disabled={busy || name.trim().length < 2}
                className="inline-flex min-h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-fg disabled:opacity-60"
              >
                ใช่ อันนี้แหละ ส่งให้แอดมินตรวจ
              </button>
            </>
          )}
        </section>
      )}

      {sent && (
        <p
          role="status"
          className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-pretty text-brand"
        >
          {sent === "pending"
            ? "ส่งแล้ว แอดมินจะตรวจก่อนเปิดให้ทุกคนเห็น ปกติไม่เกิน 1–2\u00A0วัน"
            : "มีเว็บนี้ในระบบแล้ว ไม่ต้องส่งซ้ำ"}
        </p>
      )}
    </div>
  );
}
