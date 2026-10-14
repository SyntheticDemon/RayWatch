import { describe, expect, it } from "vitest";

import { nextPinnedIds } from "./pinned-tasks";

describe("nextPinnedIds", () => {
  it("appends a task and removes it on a second pin", () => {
    const once = nextPinnedIds([], "task-a");
    expect(once).toEqual(["task-a"]);
    expect(nextPinnedIds(once, "task-b")).toEqual(["task-a", "task-b"]);
    expect(nextPinnedIds(["task-a", "task-b"], "task-a")).toEqual(["task-b"]);
  });
});
