import { describe, expect, it } from "vitest";

import { isSubmissionJob } from "@/features/jobs/use-jobs-hub-filters";

describe("isSubmissionJob", () => {
  it("classifies Ray submission and fixture ids", () => {
    expect(isSubmissionJob("raysubmit_abc")).toBe(true);
    expect(isSubmissionJob("01000000")).toBe(true);
    expect(isSubmissionJob("ray_driver_nested_demo")).toBe(false);
  });
});
