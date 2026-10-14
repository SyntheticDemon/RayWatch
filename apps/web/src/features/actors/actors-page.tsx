import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ActorDetailDrawer } from "@/features/actors/actor-detail-drawer";
import { filterActors } from "@/features/actors/actor-filters";
import { fetchClusterActors, triggerSync } from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";
import { Button, Input, Select } from "@/shared/ui/primitives";
import { SyncStatus } from "@/shared/ui/sync-status";

const ACTOR_STATES = ["", "ALIVE", "DEAD", "RESTARTING", "PENDING_CREATION", "DEPENDENCIES_UNREADY"];

export function ActorsPage() {
  const queryClient = useQueryClient();
  const { connected } = useLiveSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("id");
  const clearFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("id");
    setSearchParams(next, { replace: true });
  };
  const filters = {
    id: searchParams.get("actor") ?? "",
    className: searchParams.get("class") ?? "",
    name: searchParams.get("name") ?? "",
    state: searchParams.get("state") ?? "",
    job: searchParams.get("job") ?? "",
    pid: searchParams.get("pid") ?? "",
    node: searchParams.get("node") ?? "",
    namespace: searchParams.get("ns") ?? "",
  };
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    const param =
      key === "className" ? "class" : key === "namespace" ? "ns" : key === "id" ? "actor" : key;
    if (value) next.set(param, value);
    else next.delete(param);
    setSearchParams(next, { replace: true });
  };
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const actorsQuery = useQuery({
    queryKey: ["cluster-actors"],
    queryFn: () => fetchClusterActors(500),
    refetchInterval: connected ? false : 8000,
  });

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cluster-actors"] }),
  });

  const visibleActors = useMemo(
    () => filterActors(actorsQuery.data?.items ?? [], filters),
    [actorsQuery.data, searchParams],
  );

  const actorMatchesFocus = useMemo(() => {
    if (!focusId) return () => false;
    return (actorId: string) => actorId === focusId;
  }, [focusId]);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusId, actorsQuery.data]);

  return (
    <main className="actors-page">
      <Breadcrumbs
        items={[{ label: "Jobs", to: "/" }, { label: "Actors", current: true }]}
      />
      <header className="page-title-row">
        <div>
          <h1 className="page-title">Actors</h1>
          <p className="page-subtitle">Live Ray actors from the cluster index</p>
        </div>
        <div className="page-title-actions">
          <SyncStatus sync={actorsQuery.data?.sync} connected={connected} />
          <Button
            variant="primary"
            size="sm"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            Sync from Ray
          </Button>
        </div>
      </header>

      <section className="table-card">
        {actorsQuery.isLoading ? (
          <p className="table-card-loading">Loading actors…</p>
        ) : actorsQuery.error ? (
          <p className="error-banner">Could not load actors.</p>
        ) : (
          <div className="actor-table-scroll">
          <table className="simple-table actor-table">
            <thead>
              <tr>
                <th>Actor ID</th>
                <th>Class</th>
                <th>Name</th>
                <th>State</th>
                <th>Job</th>
                <th>PID</th>
                <th>Node</th>
                <th>Namespace</th>
                <th>Restarts</th>
                <th>Placement group</th>
              </tr>
              <tr className="actor-filter-row">
                <th><Input aria-label="Filter actor ID" placeholder="Filter…" value={filters.id} onChange={(e) => setFilter("id", e.target.value)} /></th>
                <th><Input aria-label="Filter actor class" placeholder="Filter…" value={filters.className} onChange={(e) => setFilter("className", e.target.value)} /></th>
                <th><Input aria-label="Filter actor name" placeholder="Filter…" value={filters.name} onChange={(e) => setFilter("name", e.target.value)} /></th>
                <th>
                  <Select aria-label="Filter actor state" value={filters.state} onChange={(e) => setFilter("state", e.target.value)}>
                    {ACTOR_STATES.map((state) => (
                      <option key={state || "all"} value={state}>{state || "All states"}</option>
                    ))}
                  </Select>
                </th>
                <th><Input aria-label="Filter actor job" placeholder="Filter…" value={filters.job} onChange={(e) => setFilter("job", e.target.value)} /></th>
                <th><Input aria-label="Filter actor PID" placeholder="Filter…" value={filters.pid} onChange={(e) => setFilter("pid", e.target.value)} /></th>
                <th><Input aria-label="Filter actor node" placeholder="Filter…" value={filters.node} onChange={(e) => setFilter("node", e.target.value)} /></th>
                <th><Input aria-label="Filter actor namespace" placeholder="Filter…" value={filters.namespace} onChange={(e) => setFilter("namespace", e.target.value)} /></th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleActors.length === 0 ? (
                <tr>
                  <td colSpan={10}>No actors match these filters.</td>
                </tr>
              ) : visibleActors.map((actor) => (
                <tr
                  key={actor.actor_id}
                  ref={actorMatchesFocus(actor.actor_id) ? highlightRef : undefined}
                  className={actorMatchesFocus(actor.actor_id) ? "row-highlight" : undefined}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("id", actor.actor_id);
                    setSearchParams(next, { replace: true });
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td className="mono cell-ellipsis" title={actor.actor_id}>
                    {actor.actor_id}
                  </td>
                  <td>{actor.class_name ?? "—"}</td>
                  <td>{actor.name || actor.repr_name || "—"}</td>
                  <td>
                    <span className="badge badge-running">{actor.state ?? "—"}</span>
                  </td>
                  <td className="mono">
                    {actor.job_id ? (
                      <Link to={`/jobs/${actor.job_id}`} className="text-link">
                        {actor.job_id}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{actor.pid ?? "—"}</td>
                  <td className="mono cell-ellipsis" title={actor.node_id ?? ""}>{actor.node_id ?? "—"}</td>
                  <td>{actor.ray_namespace ?? "—"}</td>
                  <td>{actor.num_restarts ?? 0}</td>
                  <td className="mono cell-ellipsis" title={actor.placement_group_id ?? ""}>{actor.placement_group_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
      {focusId ? <ActorDetailDrawer actorId={focusId} onClose={clearFocus} /> : null}
    </main>
  );
}
