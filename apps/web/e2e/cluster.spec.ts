import { expect, test } from "@playwright/test";

test("cluster page loads nodes from fixtures", async ({ page }) => {
  await page.goto("/cluster");
  await expect(page.getByRole("heading", { name: "Cluster" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Cluster summary" })).toBeVisible();
  await expect(page.getByText("Nodes alive")).toBeVisible();
  await expect(page.getByText("node-abc")).toBeVisible();
  await expect(page.getByText("actor-demo-1")).toBeVisible();
  await expect(page.getByText("obj-demo-hex-1")).toBeVisible();
});
