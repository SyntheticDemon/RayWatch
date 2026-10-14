import { describe, expect, it } from "vitest";

import { mergeTaskItems } from "@/shared/lib/merge-task-previews";
import type { TaskSummary } from "@/shared/api/client";

const task = (id: string, status = "RUNNING"): TaskSummary => ({
  task_id: id,
  job_id: "j1",
  name: id,
  status,
  func_or_class: "",
  worker_id: null,
  actor_id: null,
  parent_task_id: null,
  attempt_count: 1,
  error_message: null,
  started_at: null,
  ended_at: null,
});

describe("mergeTaskItems", () => {
  it("updates status and appends new tasks", () => {
    const merged = mergeTaskItems([task("a")], [task("a", "FAILED"), task("b")]);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.status).toBe("FAILED");
    expect(merged[1]?.task_id).toBe("b");
  });
});
