import { expect, test } from "@playwright/test";

test("search updates URL without clearing status filter", async ({ page }) => {
  await page.goto("/?status=RUNNING");
  await expect(page).toHaveURL(/status=RUNNING/);

  const search = page.getByLabel("Search jobs");
  await search.fill("train");
  await expect(page).toHaveURL(/q=train/);
  await expect(page).toHaveURL(/status=RUNNING/);
});

test("job kind internal filter shows driver jobs only", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Job kind").selectOption("internal");
  await expect(page).toHaveURL(/kind=internal/);
  await expect(page.getByText("ray_driver_nested_demo")).toBeVisible();
  await expect(page.getByText("01000000")).not.toBeVisible();
});

test("time preset last 24 hours sets period param", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Last 24 hours" }).click();
  await expect(page).toHaveURL(/period=24h/);
});

test("row opens job detail with nested runs section", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "01000000" }).click();
  await expect(page.getByRole("heading", { name: "Nested runs" })).toBeVisible();
});
