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

test("detail page shows deadline, source link and disclaimer", async ({ page }) => {
  await page.goto("/?status=closing&sort=deadline");
  await page.getByRole("link", { name: /ผู้ช่วยวิจัยโครงการ Data Platform/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Data Platform");
  await expect(page.getByText(/เหลือ 2 วัน/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /เปิดประกาศต้นทาง/ })).toHaveAttribute("href", /example\.com/);
  await expect(page.locator("main").getByText(/ไม่ใช่ช่องทางทางการ/)).toBeVisible();
});

test("no horizontal scroll on the home page", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
