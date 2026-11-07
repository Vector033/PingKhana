import { expect, test } from "@playwright/test";

test("home lists open announcements and filters by category", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ประกาศทุน");
  await expect(page.getByRole("link", { name: /ทุนเรียนดีสำหรับนักศึกษาวิทยาการคอมพิวเตอร์/ })).toBeVisible();

  await page.getByRole("link", { name: "สหกิจ/ฝึกงาน" }).first().click();
  await expect(page).toHaveURL(/category=internship/);
  await expect(page.getByRole("link", { name: /Software Engineer Intern/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /ทุนเรียนดีสำหรับนักศึกษาวิทยาการคอมพิวเตอร์/ })).toHaveCount(0);
});

test("search narrows the list", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("ค้นหา").fill("FastAPI");
  await page.getByLabel("ค้นหา").press("Enter");
  await expect(page).toHaveURL(/q=FastAPI/);
  await expect(page.getByText(/พบ 1 ประกาศ/)).toBeVisible();
});

test("card opens a quick preview without leaving the filtered list", async ({ page }) => {
  await page.goto("/?status=closing&sort=deadline");
  await page.getByRole("link", { name: /ผู้ช่วยวิจัยโครงการ Data Platform/ }).click();
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
  await expect(page.getByRole("link", { name: /ผู้ช่วยวิจัยโครงการ Data Platform/ })).toBeFocused();
});

test("closing within 3 days gets the urgency badge, later ones do not", async ({ page }) => {
  await page.goto("/");
  const urgent = page.locator("article", { hasText: "Data Platform" });
  await expect(urgent.locator(".animate-urgency")).toBeVisible();
  const later = page.locator("article", { hasText: "Software Engineer Intern" });
  await expect(later.locator(".animate-urgency")).toHaveCount(0);
});

test("detail page shows deadline, source link and disclaimer", async ({ page }) => {
  await page.goto("/?status=closing&sort=deadline");
  await page.getByRole("link", { name: /ผู้ช่วยวิจัยโครงการ Data Platform/ }).click();
  await page.getByRole("dialog").getByRole("link", { name: "หน้าเต็ม" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Data Platform");
  await expect(page.getByText(/เหลือ 2 วัน/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /เปิดประกาศต้นทาง/ })).toHaveAttribute("href", /example\.com/);
  await expect(page.getByRole("article").getByText(/ไม่ใช่ช่องทางทางการ/)).toBeVisible();
  // The drawer closed on the way out, so the page scrolls normally.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
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
