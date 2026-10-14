import { expect, test } from "@playwright/test";

test.describe("primary navigation", () => {
  test("header links reach all major surfaces", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();

    await page.getByRole("link", { name: "Actors" }).click();
    await expect(page).toHaveURL(/\/actors/);
    await expect(page.getByRole("heading", { name: "Actors" })).toBeVisible();

    await page.getByRole("link", { name: "Cluster" }).click();
    await expect(page).toHaveURL(/\/cluster/);
    await expect(page.getByRole("heading", { name: "Cluster" })).toBeVisible();

    await page.getByRole("link", { name: "Internal runs" }).click();
    await expect(page).toHaveURL(/\/internal-runs/);
    await expect(page.getByRole("heading", { name: "Internal runs" })).toBeVisible();

    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Jobs" }).click();
    await expect(page).toHaveURL("/");
  });
});
