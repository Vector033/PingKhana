"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMeta } from "@/lib/api";
import { FOLLOW_COOKIE, TAGS_COOKIE, getFollowed } from "@/lib/follow";

const YEAR = 60 * 60 * 24 * 365;

type Jar = Awaited<ReturnType<typeof cookies>>;

function writeFollowed(jar: Jar, ids: string[]) {
  if (ids.length === 0) {
    jar.delete(FOLLOW_COOKIE);
    return;
  }
  jar.set(FOLLOW_COOKIE, ids.slice(0, 100).join(","), {
    maxAge: YEAR,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/** The bookmark on a card: follow or unfollow one source. Returns whether it is followed now. */
export async function toggleFollow(id: string): Promise<boolean> {
  const meta = await getMeta();
  const now = await getFollowed();
  if (!meta.sources.some((s) => s.id === id)) return now.includes(id);
  const on = !now.includes(id);
  writeFollowed(
    await cookies(),
    on ? [...now, id] : now.filter((x) => x !== id),
  );
  return on;
}

/** Onboarding buttons: add every source of an institution to what the visitor follows. */
export async function followOrg(form: FormData) {
  const org = form.get("org");
  const meta = await getMeta();
  const add = meta.sources
    .filter((s) => s.org && s.org === org)
    .map((s) => s.id);
  const now = await getFollowed();
  writeFollowed(await cookies(), [...new Set([...now, ...add])]);
  redirect("/");
}

/** Save the ticked sources, or a whole pack when one of the pack buttons was pressed. */
export async function saveFollow(form: FormData) {
  const meta = await getMeta();
  const known = new Set(meta.sources.map((s) => s.id));
  const preset = form.get("preset");
  let ids: string[];
  if (typeof preset === "string" && preset) {
    ids = meta.sources.filter((s) => s.pack === preset).map((s) => s.id);
  } else {
    ids = form
      .getAll("source")
      .filter((v): v is string => typeof v === "string");
  }
  ids = ids.filter((id) => known.has(id));
  const jar = await cookies();
  const tags = form
    .getAll("tag")
    .filter((v): v is string => typeof v === "string" && v.length <= 32)
    .slice(0, 30);
  if (tags.length && !form.get("clear")) {
    jar.set(TAGS_COOKIE, encodeURIComponent(tags.join(",")), {
      maxAge: YEAR,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  } else if (!preset) {
    jar.delete(TAGS_COOKIE);
  }
  writeFollowed(jar, form.get("clear") ? [] : ids);
  redirect("/");
}
