// Links into the LINE bot. The add-friend URL carries the bot's basic ID (…/ti/p/@524osura).
export const ADD_FRIEND_URL = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL ?? "";

const basicId = ADD_FRIEND_URL.match(/@[\w.-]+/)?.[0] ?? null;

/**
 * Opens the bot's chat with "เตือน <id>" typed in. Sending it sets the same reminder as the
 * "เตือนฉัน" button in LINE (see backend app/line/handlers.py REMIND_TEXT).
 */
export function remindHref(announcementId: number): string | null {
  if (basicId) {
    return `https://line.me/R/oaMessage/${encodeURIComponent(basicId)}/?${encodeURIComponent(
      `เตือน ${announcementId}`,
    )}`;
  }
  return ADD_FRIEND_URL || null;
}
