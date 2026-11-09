"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AccountInfo,
  api,
  applyFollows,
  GOOGLE_CLIENT_ID,
  getToken,
  localFollows,
  markSynced,
  setToken,
} from "@/lib/account";

type Gsi = {
  accounts: {
    id: {
      initialize: (o: {
        client_id: string;
        callback: (r: { credential: string }) => void;
      }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};

export function AccountPanel() {
  const router = useRouter();
  const button = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      setMe(await api<AccountInfo>("/api/me"));
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    if (getToken()) queueMicrotask(() => void loadMe());
  }, [loadMe]);

  const onCredential = useCallback(
    async ({ credential }: { credential: string }) => {
      setError(null);
      try {
        const r = await api<{ token: string; account: AccountInfo }>(
          "/api/auth/google",
          {
            method: "POST",
            body: JSON.stringify({ credential }),
          },
        );
        setToken(r.token);
        const local = localFollows();
        let acc = r.account;
        if (acc.sources.length || acc.tags.length) {
          applyFollows(acc); // a returning user: bring their follows to this device
        } else if (local.sources.length || local.tags.length) {
          acc = await api<AccountInfo>("/api/me/follow", {
            method: "PUT",
            body: JSON.stringify(local),
          });
        }
        markSynced(acc);
        setMe(acc);
        router.refresh();
      } catch {
        setError("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    },
    [router],
  );

  useEffect(() => {
    const g = (window as unknown as { google?: Gsi }).google;
    if (!gsiReady || me || !g || !button.current) return;
    g.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: onCredential,
    });
    g.accounts.id.renderButton(button.current, {
      // Google's dark button in dark mode; the light outline one otherwise.
      theme: window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "filled_black"
        : "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      locale: "th",
    });
  }, [gsiReady, me, onCredential]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="mt-6 rounded-xl bg-surface-2 p-4 text-sm text-muted">
        ยังไม่ได้เปิดการเข้าสู่ระบบบนเว็บนี้ ใช้งานแบบไม่ล็อกอินได้ทุกอย่าง
        การติดตามจะจำไว้ในเบราว์เซอร์นี้
      </p>
    );
  }

  if (!me) {
    return (
      <div className="mt-6 space-y-3">
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setGsiReady(true)}
        />
        {/* Google draws the button in a light-scheme iframe. If its parent's color-scheme
            differs (our dark mode), the browser paints an opaque white box behind it. */}
        <div
          ref={button}
          className="min-h-11"
          style={{ colorScheme: "light" }}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <p className="text-sm text-muted">
          เก็บแค่อีเมลและชื่อจาก Google เพื่อจำแหล่งข่าวที่ติดตาม
          ลบบัญชีได้ทุกเมื่อ
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="font-semibold">{me.name ?? me.email}</p>
        <p className="text-sm text-muted">{me.email}</p>
        <p className="mt-3 text-sm">
          ติดตาม {me.sources.length} แหล่ง · {me.tags.length} แท็ก
          (ตรงกันทุกเครื่องที่ล็อกอิน)
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">ผูกกับ LINE</h2>
        {me.line_linked ? (
          <p className="mt-1 text-sm text-muted">
            ผูกแล้ว บอทใน LINE จะส่งข่าวตามกลุ่มของแหล่งที่ติดตามบนเว็บ
          </p>
        ) : code ? (
          <p className="mt-1 text-sm">
            พิมพ์ <b className="font-mono text-base">ผูก {code}</b> ในแชทบอท
            PingKhana ภายใน 10 นาที
          </p>
        ) : (
          <button
            onClick={async () =>
              setCode(
                (
                  await api<{ code: string }>("/api/me/line-code", {
                    method: "POST",
                  })
                ).code,
              )
            }
            className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-line-strong px-4 text-sm font-medium hover:border-brand hover:text-brand"
          >
            ขอรหัสผูกบัญชี
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setToken(null);
            setMe(null);
          }}
          className="inline-flex min-h-11 items-center rounded-xl border border-line-strong px-4 text-sm"
        >
          ออกจากระบบ
        </button>
        <button
          onClick={async () => {
            if (
              !confirm(
                "ลบบัญชีและรายการที่ติดตามที่เก็บไว้ในบัญชี? (สิ่งที่จำไว้ในเบราว์เซอร์นี้ยังอยู่)",
              )
            )
              return;
            await api("/api/me", { method: "DELETE" });
            setToken(null);
            setMe(null);
          }}
          className="inline-flex min-h-11 items-center rounded-xl border border-danger/50 px-4 text-sm text-danger"
        >
          ลบบัญชี
        </button>
      </div>
    </div>
  );
}
