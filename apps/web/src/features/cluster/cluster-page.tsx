import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import {
  fetchClusterActors,
  fetchClusterNodes,
  fetchClusterObjects,
  fetchClusterOverview,
  triggerSync,
} from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Button } from "@/shared/ui/primitives";
import { clusterBreadcrumbs } from "@/shared/ui/breadcrumb-trail";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";
import { SyncStatus } from "@/shared/ui/sync-status";

function formatGiB(bytes: number): string {
  if (!bytes) return "—";
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
}

export function ClusterPage() {
  const queryClient = useQueryClient();
  const { connected } = useLiveSync();
  const [searchParams] = useSearchParams();
  const focusKind = searchParams.get("focus");
  const focusId = searchParams.get("id");
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const nodeMatchesFocus = useMemo(() => {
    if (focusKind !== "node" || !focusId) return () => false;
    return (nodeId: string) => nodeId === focusId;
  }, [focusKind, focusId]);

  const actorMatchesFocus = useMemo(() => {
    if (focusKind !== "actor" || !focusId) return () => false;
    return (actorId: string) => actorId === focusId;
  }, [focusKind, focusId]);

  const objectMatchesFocus = useMemo(() => {
    if (focusKind !== "object" || !focusId) return () => false;
    return (objectId: string) => objectId === focusId;
  }, [focusKind, focusId]);

  const overviewQuery = useQuery({
    queryKey: ["cluster-overview"],
    queryFn: fetchClusterOverview,
    refetchInterval: connected ? false : 8000,
  });

  const nodesQuery = useQuery({
    queryKey: ["cluster-nodes"],
    queryFn: fetchClusterNodes,
    refetchInterval: connected ? false : 8000,
  });

  const actorsQuery = useQuery({
    queryKey: ["cluster-actors"],
    queryFn: () => fetchClusterActors(200),
    refetchInterval: connected ? false : 8000,
  });

  const objectsQuery = useQuery({
    queryKey: ["cluster-objects"],
    queryFn: () => fetchClusterObjects(200),
    refetchInterval: connected ? false : 8000,
  });

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cluster-overview"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-actors"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-objects"] });
    },
  });

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusId, focusKind, nodesQuery.data, actorsQuery.data, objectsQuery.data]);

  const sync =
    overviewQuery.data?.sync ??
    nodesQuery.data?.sync ??
    actorsQuery.data?.sync ??
    objectsQuery.data?.sync;
  const overview = overviewQuery.data?.overview;

  return (
    <main className="cluster-page">
      <Breadcrumbs items={clusterBreadcrumbs()} />
      <header className="page-title-row">
        <div>
          <h1 className="page-title">Cluster</h1>
          <p className="page-subtitle">Nodes, actors, and resource totals from the latest Ray sync</p>
        </div>
        <div className="page-title-actions">
          <SyncStatus sync={sync} connected={connected} />
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

      {overview && (
        <div className="cluster-summary" role="region" aria-label="Cluster summary">
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Nodes alive</span>
            <span className="cluster-summary-value">
              {overview.nodes_alive}
              <span className="cluster-summary-muted"> / {overview.nodes_total}</span>
            </span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">CPUs</span>
            <span className="cluster-summary-value">{overview.cpu_total || "—"}</span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">GPUs</span>
            <span className="cluster-summary-value">
              {overview.gpu_total > 0 ? overview.gpu_total : "—"}
            </span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Memory</span>
            <span className="cluster-summary-value">{formatGiB(overview.memory_bytes_total)}</span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Actors</span>
            <span className="cluster-summary-value">{overview.actors_total}</span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Objects indexed</span>
            <span className="cluster-summary-value">{overview.objects_total}</span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Jobs indexed</span>
            <span className="cluster-summary-value">{overview.job_count}</span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Tasks indexed</span>
            <span className="cluster-summary-value">{overview.task_count}</span>
          </div>
        </div>
      )}

      <div className="cluster-grid">
        <section className="table-card">
          <header className="table-card-header">
            <h2>Nodes</h2>
            <span className="table-card-count">{nodesQuery.data?.items.length ?? "—"}</span>
          </header>
          {nodesQuery.isLoading ? (
            <p className="table-card-loading">Loading nodes…</p>
          ) : nodesQuery.error ? (
            <p className="error-banner">Could not load nodes.</p>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Node ID</th>
                  <th>Hostname</th>
                  <th>State</th>
                  <th>CPUs</th>
                  <th>GPUs</th>
                  <th>Memory</th>
                  <th>Head</th>
                </tr>
              </thead>
              <tbody>
                {nodesQuery.data?.items.map((node) => (
                  <tr
                    key={node.node_id}
                    ref={nodeMatchesFocus(node.node_id) ? highlightRef : undefined}
                    className={nodeMatchesFocus(node.node_id) ? "row-highlight" : undefined}
                  >
                    <td className="mono cell-ellipsis" title={node.node_id}>
                      {node.node_id.slice(0, 12)}…
                    </td>
                    <td>{node.hostname ?? "—"}</td>
                    <td>
                      <span className="badge badge-pending">{node.state ?? "—"}</span>
                    </td>
                    <td>{node.cpu_total ?? "—"}</td>
                    <td>{node.gpu_total ?? "—"}</td>
                    <td>{formatGiB(node.memory_bytes_total ?? 0)}</td>
                    <td>{node.is_head ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="table-card">
          <header className="table-card-header">
            <h2>Actors</h2>
            <span className="table-card-count">{actorsQuery.data?.items.length ?? "—"}</span>
          </header>
          {actorsQuery.isLoading ? (
            <p className="table-card-loading">Loading actors…</p>
          ) : actorsQuery.error ? (
            <p className="error-banner">Could not load actors.</p>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Actor ID</th>
                  <th>Class</th>
                  <th>State</th>
                  <th>Job</th>
                </tr>
              </thead>
              <tbody>
                {actorsQuery.data?.items.map((actor) => (
                  <tr
                    key={actor.actor_id}
                    ref={actorMatchesFocus(actor.actor_id) ? highlightRef : undefined}
                    className={actorMatchesFocus(actor.actor_id) ? "row-highlight" : undefined}
                  >
                    <td className="mono cell-ellipsis" title={actor.actor_id}>
                      {actor.actor_id}
                    </td>
                    <td>{actor.class_name ?? "—"}</td>
                    <td>
                      <span className="badge badge-running">{actor.state ?? "—"}</span>
                    </td>
                    <td className="mono">{actor.job_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="table-card">
          <header className="table-card-header">
            <h2>Objects</h2>
            <span className="table-card-count">{objectsQuery.data?.items.length ?? "—"}</span>
          </header>
          {objectsQuery.isLoading ? (
            <p className="table-card-loading">Loading objects…</p>
          ) : objectsQuery.error ? (
            <p className="error-banner">Could not load objects.</p>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Object ID</th>
                  <th>Size (B)</th>
                  <th>Ref type</th>
                  <th>Status</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {objectsQuery.data?.items.map((obj) => (
                  <tr
                    key={obj.object_id}
                    ref={objectMatchesFocus(obj.object_id) ? highlightRef : undefined}
                    className={objectMatchesFocus(obj.object_id) ? "row-highlight" : undefined}
                  >
                    <td className="mono cell-ellipsis" title={obj.object_id}>
                      {obj.object_id.length > 20 ? `${obj.object_id.slice(0, 20)}…` : obj.object_id}
                    </td>
                    <td>{obj.object_size ?? "—"}</td>
                    <td>{obj.reference_type ?? "—"}</td>
                    <td>{obj.task_status ?? "—"}</td>
                    <td>{obj.owner_type ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
