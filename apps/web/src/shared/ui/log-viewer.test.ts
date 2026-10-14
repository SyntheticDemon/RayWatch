import { describe, expect, it } from "vitest";

import { capLogLinesForDom, MAX_DOM_LOG_LINES } from "@/shared/ui/log-viewer";

describe("capLogLinesForDom", () => {
  it("keeps all lines under the cap", () => {
    const lines = Array.from({ length: 100 }, (_, i) => i);
    expect(capLogLinesForDom(lines)).toEqual({ domLines: lines, hidden: 0 });
  });

  it("renders only the tail when over the cap", () => {
    const lines = Array.from({ length: MAX_DOM_LOG_LINES + 50 }, (_, i) => i);
    const { domLines, hidden } = capLogLinesForDom(lines);
    expect(hidden).toBe(50);
    expect(domLines).toHaveLength(MAX_DOM_LOG_LINES);
    expect(domLines[0]).toBe(50);
  });
});
