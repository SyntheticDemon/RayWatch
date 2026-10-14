import { expect, test } from "@playwright/test";

test("job detail nested tree expands parent and opens task drawer", async ({ page }) => {
  await page.goto("/jobs/01000000");
  await expect(page.getByRole("heading", { name: "Nested runs" })).toBeVisible();
  await expect(page.getByText("train_step")).toBeVisible();

  await page
    .getByRole("button", { name: /Expand train_step nested tasks/i })
    .click();
  await expect(page.getByText("eval_step")).toBeVisible();

  await page.getByRole("cell", { name: /eval_step/ }).click();
  await expect(page).toHaveURL(/task=/);
  await expect(page.getByRole("dialog", { name: "Task detail" })).toBeVisible();
});

test("internal runs page lists driver job and nested task tree", async ({ page }) => {
  await page.goto("/internal-runs");
  await expect(page.getByText("ray_driver_nested_demo")).toBeVisible();
  await expect(page.getByText("driver_root")).toBeVisible();

  await page.getByRole("button", { name: /Expand driver_root nested tasks/i }).click();
  await expect(page.getByText("driver_child")).toBeVisible();
});

test("task page shows child tasks for parent fixture task", async ({ page }) => {
  await page.goto("/tasks/aaaabbbbccccddddeeeeeeeeffffffffffffffff02000000");
  await expect(page.getByRole("heading", { name: "Child tasks" })).toBeVisible();
  await expect(page.getByRole("link", { name: /eval_step/i })).toBeVisible();
});
