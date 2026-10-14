import { expect, test } from "@playwright/test";

test("command palette navigates on live stack", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).click();
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();

  await palette.locator(".palette-input").fill("overview");
  await palette.getByRole("button", { name: /Go to Overview/i }).click();
  await expect(page).toHaveURL(/\/overview/);

  await page.getByRole("button", { name: "Search" }).click();
  await palette.locator(".palette-input").fill("cluster");
  await palette.getByRole("button", { name: /Go to Cluster/i }).click();
  await expect(page).toHaveURL(/\/cluster/);
});
