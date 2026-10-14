import { describe, expect, it } from "vitest";

import { buildForest, buildTaskHierarchy, flattenVisibleHierarchy } from "./task-tree";
import type { HierarchyNode } from "./task-tree";

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

describe("buildTaskHierarchy", () => {
  it("collapses same-name siblings into one group", () => {
    const base = {
      job_id: "j1",
      status: "FINISHED" as const,
      func_or_class: "func.train",
      worker_id: null,
      actor_id: null,
      parent_task_id: null,
      attempt_count: 1,
      error_message: null,
      started_at: null,
      ended_at: null,
    };
    const tree = buildTaskHierarchy([
      { ...base, task_id: "a", name: "func.train" },
      { ...base, task_id: "b", name: "func.train" },
      { ...base, task_id: "c", name: "func.stop", func_or_class: "func.stop" },
    ]);
    expect(tree.map((node) => node.label).sort()).toEqual(["func.stop", "func.train"]);
    const train = tree.find((node) => node.label === "func.train");
    expect(train?.task).toBeNull();
    expect(train?.children).toHaveLength(2);
    expect(train?.counts.FINISHED).toBe(2);
  });
});

describe("flattenVisibleHierarchy", () => {
  it("includes children only when the parent group is expanded", () => {
    const nodes: HierarchyNode[] = [
      {
        key: "root",
        label: "root",
        task: null,
        counts: {},
        children: [
          {
            key: "child",
            label: "child",
            task: null,
            counts: {},
            children: [],
          },
        ],
      },
    ];
    expect(flattenVisibleHierarchy(nodes, new Set()).map((row) => row.node.key)).toEqual(["root"]);
    expect(flattenVisibleHierarchy(nodes, new Set(["root"])).map((row) => row.node.key)).toEqual([
      "root",
      "child",
    ]);
  });
});
