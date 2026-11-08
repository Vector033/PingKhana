// Keep in sync with next.config.ts. Hosts whose pictures go through Next's image optimizer (resized, cached 30 days).
// Pictures from any other host still show, loaded as-is; see components/Thumb.tsx.
export const IMAGE_HOSTS = [
  "www.cmu.ac.th",
  "www.science.cmu.ac.th",
  "www.cs.science.cmu.ac.th",
  "storage.sdd.oou.cmu.ac.th",
  "www.moe.go.th",
  "www.obec.go.th",
  "www.ksp.or.th",
];

export function optimizable(src: string): boolean {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && IMAGE_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}
