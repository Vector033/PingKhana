import { expect, test, type Page } from "@playwright/test";

// The front page repeats closing-soon items in the hero, so most checks look inside the list.
const list = (page: Page) => page.getByRole("region", { name: "รายการประกาศ" });

test("home lists open announcements and filters by category", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ที่เปิดรับ");
  await expect(list(page).getByRole("link", { name: /ทุนเรียนดีสำหรับนักศึกษาวิทยาการคอมพิวเตอร์/ })).toBeVisible();

  await page.getByRole("link", { name: "สหกิจ/ฝึกงาน" }).first().click();
  await expect(page).toHaveURL(/category=internship/);
  await expect(list(page).getByRole("link", { name: /Software Engineer Intern/ })).toBeVisible();
  await expect(list(page).getByRole("link", { name: /ทุนเรียนดีสำหรับนักศึกษาวิทยาการคอมพิวเตอร์/ })).toHaveCount(0);
});

test("search narrows the list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("FastAPI");
  await page.getByRole("searchbox").press("Enter");
  await expect(page).toHaveURL(/q=FastAPI/);
  await expect(page.getByText(/พบ 1 ประกาศ/)).toBeVisible();
});

test("card opens a quick preview without leaving the filtered list", async ({ page }) => {
  await page.goto("/?status=closing&sort=deadline");
  await list(page).getByRole("link", { name: /ผู้ช่วยวิจัยโครงการ Data Platform/ }).click();
  const drawer = page.getByRole("dialog", { name: /Data Platform/ });
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/status=closing&sort=deadline/);
  await expect(drawer.getByText(/เหลือ 2 วัน/)).toBeVisible();
  await expect(drawer.getByRole("link", { name: /ให้ LINE เตือน/ })).toHaveAttribute(
    "href",
    /line\.me\/R\/oaMessage\/%40524osura\/\?%E0%B9%80%E0%B8%95%E0%B8%B7%E0%B8%AD%E0%B8%99%20\d+/,
  );
  await expect(drawer.getByText(/ไม่ใช่ช่องทางทางการ/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(list(page).getByRole("link", { name: /ผู้ช่วยวิจัยโครงการ Data Platform/ })).toBeFocused();
});

test("general news lives on /news, without deadline or reminder", async ({ page }) => {
  await page.goto("/");
  await expect(list(page).getByRole("link", { name: /ประกาศปิดปรับปรุงห้องสมุดคณะ/ })).toHaveCount(0);
  await page.getByRole("link", { name: "ข่าวสาร", exact: true }).first().click();
  await expect(page).toHaveURL(/\/news/);
  await list(page).getByRole("link", { name: /ประกาศปิดปรับปรุงห้องสมุดคณะ/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("link", { name: /ให้ LINE เตือน/ })).toHaveCount(0);
  await expect(drawer.getByText(/วันปิดรับ/)).toHaveCount(0);
  // Focus starts on the title, not on the close button.
  await expect(drawer.getByRole("heading", { level: 2 })).toBeFocused();
});

test("closing within 3 days gets the urgency badge, later ones do not", async ({ page }) => {
  await page.goto("/");
  const urgent = list(page).locator("article", { hasText: "Data Platform" });
  await expect(urgent.locator(".animate-urgency")).toBeVisible();
  const later = list(page).locator("article", { hasText: "Software Engineer Intern" });
  await expect(later.locator(".animate-urgency")).toHaveCount(0);
});

test("detail page shows deadline, source link and disclaimer", async ({ page }) => {
  await page.goto("/?status=closing&sort=deadline");
  await list(page).getByRole("link", { name: /ผู้ช่วยวิจัยโครงการ Data Platform/ }).click();
  await page.getByRole("dialog").getByRole("link", { name: "หน้าเต็ม" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Data Platform");
  await expect(page.getByText(/เหลือ 2 วัน/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /เปิดประกาศต้นทาง/ })).toHaveAttribute("href", /example\.com/);
  await expect(page.getByRole("article").getByText(/ไม่ใช่ช่องทางทางการ/)).toBeVisible();
  // The drawer closed on the way out, so the page scrolls normally.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
});

test("front page leads with the deadlines closing soonest", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("region", { name: "ใกล้ปิดรับ" });
  await expect(hero.locator("article").first()).toContainText("Data Platform");
  // Filtering or searching drops the hero and keeps the list.
  await page.goto("/?category=job");
  await expect(page.getByRole("region", { name: "ใกล้ปิดรับ" })).toHaveCount(0);
});

test("search words are highlighted in results", async ({ page }) => {
  await page.goto("/?q=FastAPI");
  await expect(list(page).locator("mark").first()).toHaveText("FastAPI");
});

test("a guest can follow sources without an account", async ({ page }) => {
  await page.goto("/follow");
  await page.getByRole("button", { name: "มหาวิทยาลัย" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: /ที่ติดตาม \(\d+\)/ })).toHaveAttribute("aria-current", "page");
  // "ทั้งหมด" shows every source again without forgetting the choice.
  await page.getByRole("link", { name: "ทั้งหมด", exact: true }).click();
  await expect(page).toHaveURL(/all=1/);
});

test("institution picker narrows the list and the tray clears it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "เลือกสถาบัน / แหล่ง" }).click();
  const picker = page.getByRole("dialog", { name: "เลือกสถาบันหรือแหล่งข่าว" });
  await expect(picker.getByRole("searchbox")).toBeFocused();
  await picker.getByRole("searchbox").fill("ตัวอย่าง");
  await expect(picker.getByRole("link", { name: /มหาวิทยาลัยตัวอย่าง/ }).first()).toBeVisible();
  await picker.getByRole("searchbox").press("Enter");
  await expect(page).toHaveURL(/org=/);
  const chip = page.getByRole("link", { name: "เอาตัวกรอง มหาวิทยาลัยตัวอย่าง ออก" });
  await expect(chip).toBeVisible();
  await expect(list(page).getByRole("link", { name: /Software Engineer Intern/ })).toBeVisible();
  await chip.click();
  await expect(page).not.toHaveURL(/org=/);
});

test("following tab without follows offers one-click institutions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "ที่ติดตาม", exact: true }).click();
  await expect(page).toHaveURL(/following=1/);
  await expect(page.getByRole("heading", { name: "เริ่มสร้างฟีดของคุณ" })).toBeVisible();
  await page.getByRole("button", { name: /\+ ติดตาม มหาวิทยาลัยตัวอย่าง/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: /ที่ติดตาม \(1\)/ })).toHaveAttribute("aria-current", "page");
});

test("bookmark on a card follows its source without leaving the page", async ({ page }) => {
  await page.goto("/?all=1");
  const card = list(page).locator("article", { hasText: "Software Engineer Intern" });
  await card.getByRole("button", { name: "ติดตาม แหล่งข้อมูลตัวอย่าง" }).click();
  await expect(page.getByRole("status").filter({ hasText: "กำลังติดตาม แหล่งข้อมูลตัวอย่าง" }).first()).toBeAttached();
  await expect(card.getByRole("button", { name: "เลิกติดตาม แหล่งข้อมูลตัวอย่าง" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /ที่ติดตาม \(1\)/ })).toBeVisible();
  await expect(page).toHaveURL(/all=1/);
});

test("calendar file and LINE share for an open announcement", async ({ page, request }) => {
  await page.goto("/?status=closing&sort=deadline");
  const link = list(page).getByRole("link", { name: /ผู้ช่วยวิจัยโครงการ Data Platform/ });
  const href = await link.getAttribute("href");
  await link.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("link", { name: /แชร์ใน LINE/ })).toHaveAttribute("href", /social-plugins\.line\.me\/lineit\/share/);
  await expect(drawer.getByRole("link", { name: /Google Calendar/ })).toHaveAttribute("href", /calendar\.google\.com/);
  const ics = await request.get(`${href}/ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = await ics.text();
  expect(body).toContain("BEGIN:VEVENT");
  expect(body).toContain("TRIGGER:-P3D");
});

test("adding a source refuses internal addresses with a clear message", async ({ page }) => {
  await page.goto("/sources/new");
  await page.getByLabel("ลิงก์เว็บ").fill("http://127.0.0.1/");
  await page.getByRole("button", { name: "ค้นหาข่าวจากเว็บนี้" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("เครือข่ายภายใน");
});

test("admin page rejects a wrong token", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel(/รหัสแอดมิน/).fill("wrong");
  await page.getByRole("button", { name: "เข้าสู่หน้าแอดมิน" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("รหัสไม่ถูกต้อง");
});

test("tags: popular chips filter the list, followed tags get their own row", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "#ทุนเรียนดี" }).first().click();
  await expect(page).toHaveURL(/tag=/);
  await expect(page.getByRole("heading", { level: 2, name: "#ทุนเรียนดี" })).toBeVisible();
  await expect(list(page).getByRole("link", { name: /Software Engineer Intern/ })).toHaveCount(0);

  await page.goto("/follow");
  await page.getByText("#อบรมฟรี").click();
  await page.getByRole("button", { name: "บันทึก" }).click();
  const row = page.getByRole("region", { name: "ตามแท็กที่ติดตาม" });
  await expect(row.getByRole("link", { name: /Workshop: เขียน FastAPI/ })).toBeVisible();
});

test("account page works without sign-in configured", async ({ page }) => {
  await page.goto("/account");
  await expect(page.locator("main")).toContainText("ใช้งานแบบไม่ล็อกอินได้ทุกอย่าง");
});

test("interactive controls are at least 44px tall", async ({ page }) => {
  await page.goto("/");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("main a, main button, main input, main summary, header a")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        // Card title links are covered by the whole card (stretched ::after).
        return r.width > 0 && r.height < 44 && !el.closest("article");
      })
      .map((el) => el.textContent?.trim()),
  );
  expect(small).toEqual([]);
});

test("no horizontal scroll on the home page", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
