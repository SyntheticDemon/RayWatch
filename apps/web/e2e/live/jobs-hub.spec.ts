import { expect, test } from "@playwright/test";

test("jobs hub lists live Ray submission jobs", async ({ page }) => {
  await page.goto("/?period=all");
  await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();
  await expect(page.getByText("01000000")).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("link", { name: /raysubmit_/ }).first()).toBeVisible({
    timeout: 15_000,
  });
});

test("last 1 hour preset keeps recent live jobs", async ({ page }) => {
  await page.goto("/?period=all");
  await expect(page.getByRole("link", { name: /raysubmit_/ }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Last 1 hour" }).click();
  await expect(page).toHaveURL(/period=1h/);
  await expect(page.getByRole("link", { name: /raysubmit_/ }).first()).toBeVisible({
    timeout: 15_000,
  });
});
