import { expect, test } from "@playwright/test";

test("cluster page loads nodes from fixtures", async ({ page }) => {
  await page.goto("/cluster");
  await expect(page.getByRole("heading", { name: "Cluster" })).toBeVisible();
  await expect(page.getByText("node-abc")).toBeVisible();
  await expect(page.getByText("actor-demo-1")).toBeVisible();
});
