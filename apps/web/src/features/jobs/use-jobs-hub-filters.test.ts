import { describe, expect, it } from "vitest";

import {
  apiStartedAfter,
  apiStartedBefore,
  isSubmissionJob,
} from "@/features/jobs/use-jobs-hub-filters";

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
