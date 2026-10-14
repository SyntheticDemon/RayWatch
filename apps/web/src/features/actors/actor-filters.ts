import type { ActorSummary } from "@/shared/api/client";

export type ActorColumnFilters = {
  id: string;
  className: string;
  name: string;
  state: string;
  job: string;
  pid: string;
  node: string;
  namespace: string;
};

function includes(value: string | number | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return String(value ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function filterActors(actors: ActorSummary[], filters: ActorColumnFilters): ActorSummary[] {
  return actors.filter(
    (actor) =>
      includes(actor.actor_id, filters.id) &&
      includes(actor.class_name, filters.className) &&
      includes(actor.name ?? actor.repr_name, filters.name) &&
      includes(actor.state, filters.state) &&
      includes(actor.job_id, filters.job) &&
      includes(actor.pid, filters.pid) &&
      includes(actor.node_id, filters.node) &&
      includes(actor.ray_namespace, filters.namespace),
  );
}
