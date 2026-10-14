import { describe, expect, it } from "vitest";

import { logLinePath } from "@/shared/lib/log-line-link";

describe("logLinePath", () => {
  it("adds log_line query param", () => {
    expect(logLinePath("/jobs/j1", 12)).toBe("/jobs/j1?log_line=12");
    expect(logLinePath("/jobs/j1", 3, { task: "t9" })).toBe("/jobs/j1?task=t9&log_line=3");
  });
});
