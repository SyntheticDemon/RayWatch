import { describe, expect, it } from "vitest";

import { formatDuration } from "./time";

describe("formatDuration", () => {
  it("formats seconds", () => {
    const start = "2026-01-01T00:00:00.000Z";
    const end = "2026-01-01T00:00:45.000Z";
    expect(formatDuration(start, end)).toBe("45s");
  });

  it("returns dash when start missing", () => {
    expect(formatDuration(null, null)).toBe("—");
  });
});
