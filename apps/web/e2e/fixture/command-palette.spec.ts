import { expect, test } from "@playwright/test";

test("command palette navigates to actors and internal runs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).click();
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();

  await palette.locator(".palette-input").fill("internal");
  await palette.getByRole("button", { name: /Go to Internal runs/i }).click();
  await expect(page).toHaveURL(/\/internal-runs/);

  await page.getByRole("button", { name: "Search" }).click();
  await palette.locator(".palette-input").fill("actors");
  await palette.getByRole("button", { name: /Go to Actors/i }).click();
  await expect(page).toHaveURL(/\/actors/);
});
