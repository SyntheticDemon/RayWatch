import { describe, expect, it } from "vitest";

import {
  apiStartedAfter,
  apiStartedBefore,
  applyJobColumnFilters,
  isSubmissionJob,
  type ColumnFilters,
} from "@/features/jobs/use-jobs-hub-filters";

const emptyFilters: ColumnFilters = {
  jobId: "",
  submissionId: "",
  status: "",
  jobType: "",
  entrypoint: "",
  message: "",
  driverPid: "",
};

describe("applyJobColumnFilters", () => {
  const rows = [
    {
      job_id: "01000000",
      status: "RUNNING",
      entrypoint: "python train.py",
      submission_id: "01000000",
      job_type: "SUBMISSION",
      error_message: null,
      driver_pid: 11,
    },
    {
      job_id: "02000000",
      status: "SUCCEEDED",
      entrypoint: "python eval.py",
      submission_id: "02000000",
      job_type: "SUBMISSION",
      error_message: "boom",
      driver_pid: 22,
    },
  ];

  it("keeps the page rows that match submission, type, message, and pid", () => {
    expect(applyJobColumnFilters(rows, { ...emptyFilters, entrypoint: "eval" }).map((row) => row.job_id)).toEqual([
      "02000000",
    ]);
    expect(applyJobColumnFilters(rows, { ...emptyFilters, message: "boom" })).toHaveLength(1);
    expect(applyJobColumnFilters(rows, { ...emptyFilters, driverPid: "11" }).map((row) => row.job_id)).toEqual([
      "01000000",
    ]);
    expect(applyJobColumnFilters(rows, { ...emptyFilters, jobType: "driver" })).toHaveLength(0);
  });
});

describe("isSubmissionJob", () => {
  it("classifies Ray submission and fixture ids", () => {
    expect(isSubmissionJob("raysubmit_abc")).toBe(true);
    expect(isSubmissionJob("01000000")).toBe(true);
    expect(isSubmissionJob("ray_driver_nested_demo")).toBe(false);
  });
});

describe("apiStartedAfter", () => {
  it("uses stable preset keys (all/custom) without per-render churn", () => {
    expect(apiStartedAfter("all", "")).toBeUndefined();
    expect(apiStartedAfter("custom", "2020-01-01T00:00:00.000Z")).toBe("2020-01-01T00:00:00.000Z");
  });

  it("only applies before bound for custom range", () => {
    expect(apiStartedBefore("1h", "")).toBeUndefined();
    expect(apiStartedBefore("custom", "2021-01-01T00:00:00.000Z")).toBe(
      "2021-01-01T00:00:00.000Z",
    );
  });

  it("computes rolling 1h window only when fetching", () => {
    const t0 = Date.now();
    const after = apiStartedAfter("1h", "");
    expect(after).toBeDefined();
    const parsed = Date.parse(after!);
    expect(parsed).toBeGreaterThanOrEqual(t0 - 60 * 60 * 1000 - 1000);
    expect(parsed).toBeLessThanOrEqual(t0 - 60 * 60 * 1000 + 1000);
  });
});
