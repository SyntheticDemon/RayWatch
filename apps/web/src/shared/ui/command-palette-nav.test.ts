import { describe, expect, it } from "vitest";

import { paletteItemsForQuery, pathForSearchHit } from "@/shared/ui/command-palette-nav";

describe("pathForSearchHit", () => {
  it("routes cluster entities", () => {
    expect(
      pathForSearchHit({
        kind: "actor",
        id: "abc",
        label: "Foo",
        job_id: "j1",
        status: "ALIVE",
      }),
    ).toBe("/cluster?focus=actor&id=abc");
    expect(
      pathForSearchHit({ kind: "node", id: "n1", label: "host", job_id: null, status: "ALIVE" }),
    ).toBe(
      "/cluster?focus=node&id=n1",
    );
  });
});

describe("paletteItemsForQuery", () => {
  it("shows nav commands when palette opens empty", () => {
    const items = paletteItemsForQuery("", []);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.type === "command")).toBe(true);
  });

  it("includes API hits when query is long enough", () => {
    const items = paletteItemsForQuery("demo", [
      { kind: "job", id: "j1", label: "demo", job_id: "j1", status: "RUNNING" },
    ]);
    expect(items.some((i) => i.type === "hit")).toBe(true);
  });
});
