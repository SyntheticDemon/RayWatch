import { expect, test } from "@playwright/test";

const longJobId = process.env.RAYWATCH_E2E_LONG_JOB_ID ?? "";
const failJobId = process.env.RAYWATCH_E2E_FAIL_JOB_ID ?? "";

test.beforeAll(() => {
  if (!longJobId || !failJobId) {
    throw new Error("Set RAYWATCH_E2E_LONG_JOB_ID and RAYWATCH_E2E_FAIL_JOB_ID (run scripts/e2e-ray-harness.sh)");
  }
});

test("live job logs show Ray output", async ({ page }) => {
  await page.goto(`/jobs/${failJobId}`);
  await expect(page.getByRole("heading", { name: "Job logs" })).toBeVisible();
  await expect(page.locator(".log-viewer-lines")).toContainText("e2e-fail-marker", {
    timeout: 30_000,
  });
});

test("stop job sends request to Ray", async ({ page }) => {
  await page.goto(`/jobs/${longJobId}`);
  await expect(page.getByRole("button", { name: "Stop job" })).toBeVisible();
  await page.getByRole("button", { name: "Stop job" }).click();
  await page.getByRole("button", { name: "Confirm stop" }).click();
  await expect(page.getByRole("status")).toContainText(/stop|STOPPED|Ray/i, { timeout: 20_000 });
  await page.getByRole("button", { name: "Sync from Ray" }).click();
  await expect(page.locator("dd").filter({ hasText: /STOPPED|FAILED|SUCCEEDED/i })).toBeVisible({
    timeout: 45_000,
  });
});
