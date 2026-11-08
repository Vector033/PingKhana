"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMeta } from "@/lib/api";
import { FOLLOW_COOKIE } from "@/lib/follow";

const YEAR = 60 * 60 * 24 * 365;

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
  if (ids.length === 0 || form.get("clear")) {
    jar.delete(FOLLOW_COOKIE);
  } else {
    jar.set(FOLLOW_COOKIE, ids.join(","), {
      maxAge: YEAR,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  redirect("/");
}
