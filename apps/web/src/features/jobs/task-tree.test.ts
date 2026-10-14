import { describe, expect, it } from "vitest";

import { buildForest } from "./task-tree";

describe("buildForest", () => {
  it("nests children under parent", () => {
    const tasks = [
      {
        task_id: "p",
        job_id: "j1",
        name: "parent",
        status: "RUNNING",
        func_or_class: "",
        worker_id: null,
        actor_id: null,
        parent_task_id: null,
        attempt_count: 1,
        error_message: null,
        started_at: null,
        ended_at: null,
      },
      {
        task_id: "c",
        job_id: "j1",
        name: "child",
        status: "RUNNING",
        func_or_class: "",
        worker_id: null,
        actor_id: null,
        parent_task_id: "p",
        attempt_count: 1,
        error_message: null,
        started_at: null,
        ended_at: null,
      },
    ];
    const forest = buildForest(tasks);
    expect(forest).toHaveLength(1);
    expect(forest[0].children).toHaveLength(1);
    expect(forest[0].children[0].task.task_id).toBe("c");
  });
});
