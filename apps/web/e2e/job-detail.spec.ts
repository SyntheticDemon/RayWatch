import { expect, test } from "@playwright/test";

test("fixture job shows breadcrumb trail", async ({ page }) => {
  await page.goto("/jobs/01000000");
  const trail = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(trail.getByRole("link", { name: "Jobs" })).toBeVisible();
  await expect(trail).toContainText("train.py");
});

test("fixture job logs panel shows content and toolbar works", async ({ page }) => {
  await page.goto("/jobs/01000000");
  await expect(page.getByRole("heading", { name: "Job logs" })).toBeVisible();
  await expect(page.locator(".log-viewer-lines")).toContainText("train.py");
  await expect(page.getByRole("button", { name: "1" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Pause tail" }).click();
  await expect(page.getByText("Tail paused")).toBeVisible();

  await page.getByLabel("Filter log lines").fill("epoch");
  await expect(page.locator(".log-viewer-lines")).toContainText("epoch");
  await expect(page.locator(".log-viewer-lines")).not.toContainText("raywatch-fixture");
});

test("fixture job shows task tree entries", async ({ page }) => {
  await page.goto("/jobs/01000000");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await expect(page.getByText("train_step")).toBeVisible();
});

test("fixture stop job flow marks job stopped", async ({ page }) => {
  await page.goto("/jobs/02000000");
  await page.getByRole("button", { name: "Stop job" }).click();
  await page.getByRole("button", { name: "Confirm stop" }).click();
  await expect(page.getByRole("status")).toContainText(/fixture|STOPPED/i);
  await expect(page.locator("dd").filter({ hasText: "STOPPED" })).toBeVisible();
});
