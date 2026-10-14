import { expect, test } from "@playwright/test";

test("fixture task page loads and links to job", async ({ page }) => {
  await page.goto("/tasks/aaaabbbbccccddddeeeeeeeeffffffffffffffff02000000");
  await expect(page.getByRole("heading", { name: /train_step/i })).toBeVisible();
  await expect(page.locator(".task-inspector").getByRole("link", { name: "01000000" })).toBeVisible();
  await page.getByRole("link", { name: "View in job context" }).click();
  await expect(page).toHaveURL(/\/jobs\/01000000\?task=/);
});
