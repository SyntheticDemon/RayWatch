import { describe, expect, it } from "vitest";

import { mergeJobRows } from "@/shared/lib/merge-jobs-preview";
import type { JobSummary } from "@/shared/api/client";

const job = (id: string, status = "RUNNING"): JobSummary => ({
  job_id: id,
  status,
  entrypoint: `${id}.py`,
  started_at: null,
  ended_at: null,
  task_running: 0,
  task_failed: 0,
  task_total: 0,
  error_message: null,
});

describe("mergeJobRows", () => {
  it("updates rows and prepends new preview jobs", () => {
    const merged = mergeJobRows([job("a")], [job("a", "FAILED"), job("b")]);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.job_id).toBe("b");
    expect(merged[1]?.status).toBe("FAILED");
  });

  it("does not add rows when allowNewRows is false", () => {
    const merged = mergeJobRows([job("a")], [job("b")], { allowNewRows: false });
    expect(merged).toHaveLength(1);
    expect(merged[0]?.job_id).toBe("a");
  });
});
