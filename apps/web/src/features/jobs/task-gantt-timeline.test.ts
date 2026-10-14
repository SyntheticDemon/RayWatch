import { describe, expect, it } from "vitest";

import { buildGanttRange } from "@/features/jobs/task-gantt-timeline";
import type { TaskSummary } from "@/shared/api/client";

function task(partial: Partial<TaskSummary> & Pick<TaskSummary, "task_id">): TaskSummary {
  const { task_id, ...rest } = partial;
  return {
    task_id,
    job_id: "job-1",
    name: "fn",
    status: "RUNNING",
    func_or_class: "",
    worker_id: null,
    actor_id: null,
    parent_task_id: null,
    attempt_count: 1,
    error_message: null,
    started_at: null,
    ended_at: null,
    ...rest,
  };
}

describe("buildGanttRange", () => {
  it("spans earliest start to latest end across tasks", () => {
    const range = buildGanttRange([
      task({
        task_id: "a",
        started_at: "2024-03-09T16:00:00.000Z",
        ended_at: "2024-03-09T16:05:00.000Z",
        status: "FINISHED",
      }),
      task({
        task_id: "b",
        started_at: "2024-03-09T16:02:00.000Z",
        ended_at: "2024-03-09T16:10:00.000Z",
        status: "FINISHED",
      }),
    ]);
    expect(range).not.toBeNull();
    expect(range!.start).toBe(Date.parse("2024-03-09T16:00:00.000Z"));
    expect(range!.end).toBe(Date.parse("2024-03-09T16:10:00.000Z"));
  });
});
