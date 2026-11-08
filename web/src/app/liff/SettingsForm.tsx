"use client";

import { useEffect, useState } from "react";
import type { Announcement, Category, Meta } from "@/lib/api";
import { thDate } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8100";
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_LIFF === "1";

type Prefs = {
  year: number | null;
  major: string | null;
  categories: Category[];
  notify_new: boolean;
  packs?: string[];
  reminders?: Announcement[];
};

type State =
  | { kind: "loading" }
  | { kind: "outside-line" }
  | { kind: "error"; message: string }
  | { kind: "ready"; token: string; meta: Meta; prefs: Prefs }
  | { kind: "deleted" };

async function getToken(): Promise<string | null> {
  if (LIFF_ID) {
    const liff = (await import("@line/liff")).default;
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return null;
    }
    return liff.getIDToken();
  }
  if (DEV_MODE) {
    // Local development without LINE: the API accepts "dev:<id>" only while it runs in dry-run.
    let id = localStorage.getItem("pingkhana-dev-user");
    if (!id) {
      id = `U-dev-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("pingkhana-dev-user", id);
    }
    return `dev:${id}`;
  }
  return null;
}

export function SettingsForm() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!LIFF_ID && !DEV_MODE) setState({ kind: "outside-line" });
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const [meRes, metaRes] = await Promise.all([
          fetch(`${API}/api/liff/me`, { headers }),
          fetch(`${API}/api/meta`),
        ]);
        if (!meRes.ok || !metaRes.ok)
          throw new Error(`API ${meRes.status}/${metaRes.status}`);
        setState({
          kind: "ready",
          token,
          meta: await metaRes.json(),
          prefs: await meRes.json(),
        });
      } catch (e) {
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();
  }, []);

  if (state.kind === "loading") return <p className="text-muted">กำลังโหลด…</p>;
  if (state.kind === "outside-line")
    return (
      <p className="text-muted">
        เปิดหน้านี้จากเมนู “ตั้งค่า” ในแชท LINE ของ PingKhana
      </p>
    );
  if (state.kind === "error")
    return (
      <p className="text-danger">
        โหลดการตั้งค่าไม่สำเร็จ ({state.message}) ลองปิดแล้วเปิดใหม่
      </p>
    );
  if (state.kind === "deleted")
    return (
      <p className="rounded-xl border border-line bg-surface p-5">
        ลบข้อมูลของคุณเรียบร้อยแล้ว จะไม่มีการแจ้งเตือนอีก ถ้าอยากกลับมาใช้
        เปิดหน้านี้แล้วบันทึกใหม่ได้เลย
      </p>
    );

  const { prefs, meta, token } = state;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const update = (p: Partial<Prefs>) => {
    setSaved(false);
    setState({ ...state, prefs: { ...prefs, ...p } });
  };

  async function save() {
    setSaving(true);
    const body = {
      year: prefs.year,
      major: prefs.major,
      categories: prefs.categories,
      notify_new: prefs.notify_new,
      packs: prefs.packs?.length ? prefs.packs : ["student"],
    };
    const res = await fetch(`${API}/api/liff/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(res.ok);
  }

  async function removeReminder(id: number) {
    await fetch(`${API}/api/liff/reminders/${id}`, {
      method: "DELETE",
      headers,
    });
    update({ reminders: prefs.reminders?.filter((r) => r.id !== id) });
  }

  async function deleteAll() {
    if (!confirm("ลบข้อมูลทั้งหมดของคุณ (ชั้นปี สาขา ประเภท และรายการเตือน)?"))
      return;
    const res = await fetch(`${API}/api/liff/me`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) setState({ kind: "deleted" });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {meta.packs && meta.packs.length > 1 && (
        <fieldset>
          <legend className="font-medium">ติดตามข่าวจาก</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {meta.packs.map((p) => {
              const packs = prefs.packs ?? ["student"];
              const on = packs.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${on ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    // At least one pack stays on, or the bot would have nothing to send.
                    disabled={on && packs.length === 1}
                    onChange={() =>
                      update({
                        packs: on
                          ? packs.filter((x) => x !== p.id)
                          : [...packs, p.id],
                      })
                    }
                    className="accent-[var(--brand)]"
                  />
                  {p.th}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="font-medium">อยากรู้ประกาศประเภทไหน</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {meta.categories.map((c) => {
            const on = prefs.categories.includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${on ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    update({
                      categories: on
                        ? prefs.categories.filter((x) => x !== c.id)
                        : [...prefs.categories, c.id],
                    })
                  }
                  className="accent-[var(--brand)]"
                />
                {c.th}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">ชั้นปี</span>
          <select
            value={prefs.year ?? ""}
            onChange={(e) =>
              update({ year: e.target.value ? Number(e.target.value) : null })
            }
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
          >
            <option value="">ไม่ระบุ</option>
            {meta.years.map((y) => (
              <option key={y} value={y}>
                ปี {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">สาขา / คณะ</span>
          <select
            value={prefs.major ?? ""}
            onChange={(e) => update({ major: e.target.value || null })}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
          >
            <option value="">ไม่ระบุ</option>
            {meta.majors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.th}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="-mt-3 text-xs text-muted">
        ใช้กรองประกาศที่จำกัดชั้นปีหรือสาขา
        ถ้าไม่ระบุจะได้ทุกประกาศในประเภทที่เลือก
      </p>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={prefs.notify_new}
          onChange={(e) => update({ notify_new: e.target.checked })}
          className="mt-1 accent-[var(--brand)]"
        />
        <span>
          ส่งสรุปประกาศใหม่ที่ตรงกับฉัน (วันละไม่เกิน 1 ข้อความ)
          <span className="block text-xs text-muted">
            การเตือนกำหนดส่งที่กด “เตือนฉัน” ไว้จะยังส่งตามปกติ
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-medium text-brand-fg transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
        {saved && <span className="text-sm text-brand">บันทึกแล้ว</span>}
      </div>

      <section>
        <h2 className="font-medium">ประกาศที่ให้เตือน</h2>
        {prefs.reminders && prefs.reminders.length > 0 ? (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface text-sm">
            {prefs.reminders.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1">
                  {r.title}
                  {r.deadline && (
                    <span className="block text-xs text-muted">
                      ปิดรับ {thDate(r.deadline)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void removeReminder(r.id)}
                  className="text-xs text-muted hover:text-danger"
                >
                  เลิกเตือน
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">
            ยังไม่มี กด “เตือนฉัน” ใต้ประกาศในแชทได้เลย
          </p>
        )}
      </section>

      <section className="border-t border-line pt-5">
        <button
          type="button"
          onClick={() => void deleteAll()}
          className="text-sm text-danger underline"
        >
          ลบข้อมูลทั้งหมดของฉัน
        </button>
        <p className="mt-1 text-xs text-muted">
          เหมือนพิมพ์ “ยกเลิก” ในแชท เราเก็บแค่ LINE userId ชั้นปี สาขา ประเภท
          และรายการเตือน
        </p>
      </section>
    </form>
  );
}
