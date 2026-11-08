import { cacheLife } from "next/cache";

export type Category =
  "scholarship" | "internship" | "job" | "activity" | "general";

export type Announcement = {
  id: number;
  source_id: string;
  source_name: string;
  url: string;
  title: string;
  category: Category;
  category_th: string;
  summary_th: string | null;
  deadline: string | null;
  deadline_text: string | null;
  eligible_years: number[] | null;
  eligible_majors: string[] | null;
  min_gpax: number | null;
  published_on: string | null;
  first_seen_at: string;
  /** Thumbnail from the source's list page, if it has one. */
  image_url?: string | null;
};

export type Page = {
  items: Announcement[];
  total: number;
  page: number;
  page_size: number;
};

export type Meta = {
  categories: { id: Category; th: string }[];
  majors: { id: string; th: string }[];
  years: number[];
  sources: { id: string; name: string; url: string; pack?: string }[];
  /** Groups of sources people can follow (student, teacher, ...). */
  packs?: { id: string; th: string }[];
  liff_id: string;
};

export type Stats = {
  announcements: number;
  open_with_deadline: number;
  users: number;
  followers: number | null;
  reminders_set: number;
  reminders_sent: number;
  /** How announcements were read: "gemini", "rules", "rules:gemini-error". */
  extraction?: Record<string, number>;
  sources: {
    id: string;
    name: string;
    url: string;
    last_success_at: string | null;
    healthy: boolean;
    pack?: string;
    last_error: string | null;
  }[];
};

export const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8100";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

// Announcements change at most once an hour (the collector's interval), so a few minutes of
// caching costs nothing in freshness and keeps the API quiet.
export async function getAnnouncements(query: string): Promise<Page> {
  "use cache";
  cacheLife("minutes");
  return get<Page>(`/api/announcements?${query}`);
}

export async function getAnnouncement(
  id: string,
): Promise<Announcement | null> {
  "use cache";
  cacheLife("minutes");
  const res = await fetch(
    `${API_URL}/api/announcements/${encodeURIComponent(id)}`,
  );
  if (res.status === 404 || res.status === 422) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function getMeta(): Promise<Meta> {
  "use cache";
  cacheLife("hours");
  return get<Meta>("/api/meta");
}

export async function getStats(): Promise<Stats> {
  "use cache";
  cacheLife("minutes");
  return get<Stats>("/api/stats");
}
