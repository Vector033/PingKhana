import { getAnnouncement } from "@/lib/api";
import { icsFor } from "@/lib/share";

/** /a/123/ics — calendar file for the announcement's closing date (opens in any calendar app). */
export async function GET(_req: Request, ctx: RouteContext<"/a/[id]/ics">) {
  const { id } = await ctx.params;
  const a = await getAnnouncement(id).catch(() => null);
  if (!a || !a.deadline) {
    return new Response("ประกาศนี้ไม่มีวันปิดรับ", { status: 404 });
  }
  return new Response(icsFor(a), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pingkhana-${a.id}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
