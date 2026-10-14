import { expect, test } from "@playwright/test";

test("search stays on the jobs page and shows matches", async ({ page }) => {
  await page.goto("/?status=RUNNING");
  await expect(page).toHaveURL(/status=RUNNING/);

  const search = page.getByLabel("Search jobs");
  const results = page.waitForResponse(
    (response) => response.url().includes("/jobs") && response.url().includes("q=train"),
  );
  await search.click();
  await search.pressSequentially("train", { delay: 40 });
  await results;
  await expect(page).toHaveURL(/q=train/);
  await expect(page).toHaveURL(/status=RUNNING/);
  await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  await expect(search).toBeFocused();
  await expect(page.getByRole("link", { name: "01000000" })).toBeVisible();
  await expect(page.getByRole("link", { name: "02000000" })).toHaveCount(0);
});

test("job column filters keep the page and hide non-matching jobs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  await page.getByLabel("Filter entrypoint column").fill("eval");
  await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "02000000" })).toBeVisible();
  await expect(page.getByRole("link", { name: "01000000" })).toHaveCount(0);
});

test("job kind internal filter shows driver jobs only", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Job kind").selectOption("internal");
  await expect(page).toHaveURL(/kind=internal/);
  await expect(page.getByRole("link", { name: "ray_driver_nested_demo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "01000000" })).toHaveCount(0);
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
