// Refresh the README screenshots: `npm run build && npm run start -- -p 3005` first, then
// `node scripts/screenshots.mjs`. Images go to ../docs/screenshots.
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3005";
const OUT = new URL("../../docs/screenshots/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 860 },
  deviceScaleFactor: 1.5,
  colorScheme: "light",
});
let page = await desktop.newPage();
await page.goto(`${BASE}/`);
await page.locator("article").first().waitFor();
await page.screenshot({ path: new URL("home.png", OUT).pathname.slice(1) });
await page.goto(`${BASE}/?status=closing&sort=deadline`);
await page.locator("article a").first().click();
await page.waitForURL(/\/a\/\d+/);
await page.getByRole("heading", { level: 1 }).waitFor();
await page.screenshot({ path: new URL("detail.png", OUT).pathname.slice(1) });
await page.goto(`${BASE}/sources`);
await page.locator("table").waitFor();
await page.screenshot({ path: new URL("sources.png", OUT).pathname.slice(1), fullPage: true });

const phone = await browser.newContext({ ...devices["Pixel 7"], colorScheme: "dark" });
page = await phone.newPage();
await page.goto(`${BASE}/?status=closing&sort=deadline`);
await page.locator("article").first().waitFor();
await page.screenshot({ path: new URL("mobile-closing.png", OUT).pathname.slice(1) });

await browser.close();
console.log("saved to", OUT.pathname);
