import { expect, test } from "@playwright/test";

test("overview shows live job count", async ({ page }) => {
  await page.goto("/overview");
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Overview summary" })).toBeVisible();
  await expect(page.getByText("Jobs indexed")).toBeVisible();
  const jobsLink = page.getByRole("link").filter({ hasText: /^\d+$/ }).first();
  await expect(jobsLink).toBeVisible({ timeout: 15_000 });
});

test("cluster page shows live ray head node", async ({ page }) => {
  await page.goto("/cluster");
  await expect(page.getByRole("heading", { name: "Cluster" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Cluster summary" })).toBeVisible();
  await expect(page.getByText("Nodes alive")).toBeVisible();
  const nodeLink = page.locator("table tbody a.cell-link").first();
  await expect(nodeLink).toBeVisible({ timeout: 20_000 });
  await nodeLink.click();
  await expect(page.getByRole("heading", { name: "Node" })).toBeVisible();
  await expect(page.locator("dl.detail-grid")).toBeVisible();
});

test("actors page loads on live cluster", async ({ page }) => {
  await page.goto("/actors");
  await expect(page.getByRole("heading", { name: "Actors" })).toBeVisible();
});
