import { expect, test } from "@playwright/test";

test("jobs hub loads fixture jobs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /jobs/i })).toBeVisible();
  await expect(page.getByText("01000000")).toBeVisible();
});

test("job detail shows entrypoint", async ({ page }) => {
  await page.goto("/jobs/01000000");
  await expect(page.getByRole("heading", { name: "01000000" })).toBeVisible();
});
