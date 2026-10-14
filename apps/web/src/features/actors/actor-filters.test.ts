import { describe, expect, it } from "vitest";

import { filterActors, type ActorColumnFilters } from "@/features/actors/actor-filters";
import type { ActorSummary } from "@/shared/api/client";

const empty: ActorColumnFilters = {
  id: "",
  className: "",
  name: "",
  state: "",
  job: "",
  pid: "",
  node: "",
  namespace: "",
};

const actors: ActorSummary[] = [
  {
    actor_id: "actor-demo-1",
    class_name: "Counter",
    name: "counter-a",
    state: "ALIVE",
    job_id: "01000000",
    worker_id: "w1",
    node_id: "node-abc",
    pid: 42,
    ray_namespace: "serve",
    num_restarts: 1,
    placement_group_id: "pg-1",
  },
  {
    actor_id: "actor-demo-2",
    class_name: "Worker",
    name: "worker-b",
    state: "DEAD",
    job_id: "02000000",
    worker_id: null,
    node_id: "node-zzz",
    pid: 7,
    ray_namespace: "default",
    num_restarts: 0,
    placement_group_id: null,
  },
];

describe("filterActors", () => {
  it("filters by class, state, pid, and node without dropping the other actor fields", () => {
    expect(filterActors(actors, { ...empty, className: "count" }).map((row) => row.actor_id)).toEqual([
      "actor-demo-1",
    ]);
    expect(filterActors(actors, { ...empty, state: "DEAD" }).map((row) => row.actor_id)).toEqual([
      "actor-demo-2",
    ]);
    expect(filterActors(actors, { ...empty, pid: "42", node: "abc" })).toHaveLength(1);
    expect(filterActors(actors, { ...empty, namespace: "nope" })).toHaveLength(0);
  });
});
