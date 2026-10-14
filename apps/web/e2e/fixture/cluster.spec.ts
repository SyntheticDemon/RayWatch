import { expect, test } from "@playwright/test";

test("cluster page loads nodes from fixtures", async ({ page }) => {
  await page.goto("/cluster");
  await expect(page.getByRole("heading", { name: "Cluster" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Cluster summary" })).toBeVisible();
  await expect(page.getByText("Nodes alive")).toBeVisible();
  await expect(page.getByText("node-abc")).toBeVisible();
  await expect(page.getByText("obj-demo-hex-1")).toBeVisible();
});

test("actors page loads from fixtures", async ({ page }) => {
  await page.goto("/actors");
  await expect(page.getByRole("heading", { name: "Actors" })).toBeVisible();
  await expect(page.getByText("actor-demo-1")).toBeVisible();
});

test("actor drawer shows kill for alive actor", async ({ page }) => {
  await page.goto("/actors?id=actor-demo-1");
  await expect(page.getByRole("dialog", { name: "Actor detail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kill actor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actor logs" })).toBeVisible();
  await expect(page.locator(".log-viewer-lines")).toContainText("actor-demo-1");
  await expect(page.getByText("Tail paused")).toBeVisible();
});

test("actor column filter hides non-matching actors", async ({ page }) => {
  await page.goto("/actors");
  await page.getByLabel("Filter actor class").fill("Counter");
  await expect(page.getByText("actor-demo-1")).toBeVisible();
  await page.getByLabel("Filter actor class").fill("missing-class");
  await expect(page.getByText("No actors match these filters.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actors" })).toBeVisible();
});
