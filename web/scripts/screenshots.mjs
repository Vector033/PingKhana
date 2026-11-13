// Refresh the README / portfolio screenshots. Against the live site:
//   BASE_URL=https://pingkhana.vercel.app node scripts/screenshots.mjs
// or locally after `npm run build && npm run start -- -p 3005`. Images go to ../docs/screenshots.
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "http://localhost:3005";
const OUT = new URL("../../docs/screenshots/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const out = (name) => fileURLToPath(new URL(name, OUT));

const browser = await chromium.launch();

// Let entrance animations finish so nothing is caught mid-fade.
async function settle(page) {
  await page.waitForTimeout(900);
  // Posters in view must be painted (the image optimizer is slow on a cold cache).
  await page
    .waitForFunction(
      () =>
        [...document.images]
          .filter((i) => {
            const r = i.getBoundingClientRect();
            return r.bottom > 0 && r.top < innerHeight;
          })
          .every((i) => i.complete && i.naturalWidth > 0),
      null,
      { timeout: 30_000 },
    )
    .catch(() => {});
  await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .forEach((a) => a.finish()),
  );
}

// First card whose deadline badge reads "เหลือ N วัน"; the lead may close today (no reminder).
const remindable = (page) =>
  page
    .locator("article")
    .filter({ hasText: /เหลือ\s\d+\sวัน/ })
    .first()
    .locator("h3 a");

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 1.5,
    colorScheme: scheme,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.locator("article").first().waitFor({ timeout: 90_000 });
  await settle(page);
  await page.screenshot({ path: out(`home-${scheme}.png`) });

  // The list below the lead: toolbar and three-column poster grid.
  await page.getByRole("region", { name: "รายการประกาศ" }).evaluate((el) => {
    el.scrollIntoView();
    window.scrollBy(0, -210); // the sticky header covers ~190px
  });
  await settle(page);
  await page.screenshot({ path: out(`grid-${scheme}.png`) });
  await page.evaluate(() => window.scrollTo(0, 0));

  // Quick-preview drawer on a post that can still get a LINE reminder (2+ days left),
  // so the shot shows the green button and its 3-step timeline.
  await remindable(page).click();
  await page.getByRole("dialog").waitFor();
  await settle(page);
  await page.screenshot({ path: out(`drawer-${scheme}.png`) });
  await ctx.close();
}

const desk = await browser.newContext({
  viewport: { width: 1280, height: 860 },
  deviceScaleFactor: 1.5,
  colorScheme: "light",
});
let page = await desk.newPage();
await page.goto(`${BASE}/sources`);
await page.locator("table").waitFor({ timeout: 90_000 });
await settle(page);
await page.screenshot({ path: out("sources.png"), fullPage: true });

// Pages added when PingKhana grew past CMU: news zone, teacher pack, follow, add a source.
for (const [path, name] of [
  ["/news", "news.png"],
  ["/news?pack=teacher", "teacher-news.png"],
  ["/follow", "follow.png"],
  ["/sources/new", "add-source.png"],
]) {
  await page.goto(`${BASE}${path}`);
  await page.locator("main h1").waitFor({ timeout: 90_000 });
  await settle(page);
  await page.screenshot({ path: out(name) });
}

const phone = await browser.newContext({
  ...devices["Pixel 7"],
  colorScheme: "dark",
});
page = await phone.newPage();
await page.goto(`${BASE}/`);
await page.locator("article").first().waitFor({ timeout: 90_000 });
await settle(page);
await page.screenshot({ path: out("mobile-feed.png") });
await remindable(page).click();
await page.getByRole("dialog").waitFor();
await settle(page);
await page.screenshot({ path: out("mobile-sheet.png") });

await browser.close();
console.log("saved to", fileURLToPath(OUT));
