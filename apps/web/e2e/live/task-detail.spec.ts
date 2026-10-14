import { expect, test } from "@playwright/test";

const tasksJobId = process.env.RAYWATCH_E2E_TASKS_JOB_ID ?? "";
const apiPort = process.env.RAYWATCH_API_PORT ?? "18080";

test.beforeAll(() => {
  if (!tasksJobId) {
    throw new Error("RAYWATCH_E2E_TASKS_JOB_ID required (run scripts/e2e-ray-harness.sh)");
  }
});

test("live job shows nested tasks and opens task detail", async ({ page, request }) => {
  const tasksRes = await request.get(
    `http://127.0.0.1:${apiPort}/jobs/${tasksJobId}/tasks?limit=20`,
  );
  expect(tasksRes.ok()).toBeTruthy();
  const tasksBody = await tasksRes.json();
  const taskId = tasksBody.items?.[0]?.task_id as string | undefined;
  expect(taskId).toBeTruthy();

  await page.goto(`/jobs/${tasksJobId}`);
  await expect(page.getByRole("heading", { name: "Nested runs" })).toBeVisible({ timeout: 20_000 });

  await page.goto(`/tasks/${taskId}`);
  await expect(page.getByRole("heading", { name: /step/i })).toBeVisible();
  await expect(page.getByRole("link", { name: tasksJobId })).toBeVisible();
});
