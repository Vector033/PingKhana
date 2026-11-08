// Optional Google sign-in (see backend app/accounts.py). Off until the client id is set.
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8100";
const TOKEN = "pk.session";
const SYNCED = "pk.synced";

export type AccountInfo = {
  email: string;
  name: string | null;
  sources: string[];
  tags: string[];
  line_linked: boolean;
};

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN);
  } catch {
    return null;
  }
}

export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN, t);
    else {
      localStorage.removeItem(TOKEN);
      localStorage.removeItem(SYNCED);
    }
  } catch {}
}

function readCookie(name: string): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

const YEAR = 60 * 60 * 24 * 365;
function writeCookie(name: string, value: string) {
  document.cookie = value
    ? `${name}=${encodeURIComponent(value)}; Max-Age=${YEAR}; Path=/; SameSite=Lax`
    : `${name}=; Max-Age=0; Path=/`;
}

/** What this browser follows (the cookies the server filters by). */
export function localFollows() {
  const split = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  return {
    sources: split(readCookie("pk_follow")),
    tags: split(readCookie("pk_tags")),
  };
}

export function applyFollows(a: { sources: string[]; tags: string[] }) {
  writeCookie("pk_follow", a.sources.join(","));
  writeCookie("pk_tags", a.tags.join(","));
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) setToken(null);
  if (!res.ok) throw new Error(String(res.status));
  return res.status === 204 ? (undefined as T) : res.json();
}

/**
 * Keep the account and this browser's follows the same: push local changes made on /follow,
 * remember what was last synced so the next device can pull it.
 */
export async function syncFollows(): Promise<"pushed" | "unchanged"> {
  const local = localFollows();
  const key = JSON.stringify(local);
  let last: string | null = null;
  try {
    last = localStorage.getItem(SYNCED);
  } catch {}
  if (key === last) return "unchanged";
  await api("/api/me/follow", { method: "PUT", body: key });
  try {
    localStorage.setItem(SYNCED, key);
  } catch {}
  return "pushed";
}

export function markSynced(a: { sources: string[]; tags: string[] }) {
  try {
    localStorage.setItem(
      SYNCED,
      JSON.stringify({ sources: a.sources, tags: a.tags }),
    );
  } catch {}
}
