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
  await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .forEach((a) => a.finish()),
  );
}

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 1.5,
    colorScheme: scheme,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?sort=deadline`);
  await page.locator("article").first().waitFor({ timeout: 90_000 });
  await settle(page);
  await page.screenshot({ path: out(`home-${scheme}.png`) });

  // Quick-preview drawer on the soonest open deadline.
  await page.locator("article a").first().click();
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

const phone = await browser.newContext({ ...devices["Pixel 7"], colorScheme: "dark" });
page = await phone.newPage();
await page.goto(`${BASE}/?sort=deadline`);
await page.locator("article").first().waitFor({ timeout: 90_000 });
await settle(page);
await page.screenshot({ path: out("mobile-feed.png") });
await page.locator("article a").first().click();
await page.getByRole("dialog").waitFor();
await settle(page);
await page.screenshot({ path: out("mobile-sheet.png") });

await browser.close();
console.log("saved to", fileURLToPath(OUT));
