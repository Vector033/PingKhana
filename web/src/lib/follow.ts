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

export const TAGS_COOKIE = "pk_tags";

/** Tags the visitor follows (cookie), shown as their own strip on the front page. */
export async function getFollowedTags(): Promise<string[]> {
  const raw = (await cookies()).get(TAGS_COOKIE)?.value ?? "";
  return decodeURIComponent(raw)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 32)
    .slice(0, 30);
}
