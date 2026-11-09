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

// Google Identity Services, token flow: our own button opens Google's popup and we get an
// access token. (Google's ready-made button is an iframe whose backdrop turns white in some
// dark-mode setups, which we cannot style.)
type TokenClient = { requestAccessToken: () => void };
type Gsi = {
  accounts: {
    oauth2: {
      initTokenClient: (o: {
        client_id: string;
        scope: string;
        callback: (r: { access_token?: string; error?: string }) => void;
      }) => TokenClient;
    };
  };
};

export function AccountPanel() {
  const router = useRouter();
  const client = useRef<TokenClient | null>(null);
  const [me, setMe] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const onToken = useCallback(
    async ({ access_token }: { access_token?: string; error?: string }) => {
      setError(null);
      if (!access_token) {
        setBusy(false);
        return; // closed the popup
      }
      try {
        const r = await api<{ token: string; account: AccountInfo }>(
          "/api/auth/google",
          {
            method: "POST",
            body: JSON.stringify({ access_token }),
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
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  function initGoogle() {
    const g = (window as unknown as { google?: Gsi }).google;
    if (!g) return;
    client.current = g.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: onToken,
    });
  }

  function signIn() {
    if (!client.current) initGoogle();
    if (!client.current)
      return setError("โหลดระบบของ Google ไม่สำเร็จ ลองรีเฟรชหน้า");
    setBusy(true);
    client.current.requestAccessToken();
  }

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
          onReady={initGoogle}
        />
        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          className="inline-flex min-h-12 items-center gap-3 rounded-full border border-line-strong bg-surface px-5 font-medium text-fg shadow-sm transition hover:border-brand active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleG />
          {busy ? "กำลังเปิดหน้าต่าง Google…" : "เข้าสู่ระบบด้วย Google"}
        </button>
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

/** Google's "G" mark, as Google's sign-in branding asks for on custom buttons. */
function GoogleG() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
