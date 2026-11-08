import { cookies } from "next/headers";

// What a visitor follows on the website, without an account: source ids in a cookie.
// A cookie (not localStorage) so the server can filter the list before sending it.
export const FOLLOW_COOKIE = "pk_follow";

export async function getFollowed(): Promise<string[]> {
  const raw = (await cookies()).get(FOLLOW_COOKIE)?.value ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9_-]{1,64}$/.test(s))
    .slice(0, 100);
}
