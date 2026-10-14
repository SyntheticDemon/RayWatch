import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchClusterActors,
  fetchClusterNodes,
  triggerSync,
} from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Button } from "@/shared/ui/primitives";
import { SyncStatus } from "@/shared/ui/sync-status";

export function ClusterPage() {
  const queryClient = useQueryClient();
  const { connected } = useLiveSync();

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

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cluster-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-actors"] });
    },
  });

  const sync = nodesQuery.data?.sync ?? actorsQuery.data?.sync;

  return (
    <main className="cluster-page">
      <header className="page-title-row">
        <div>
          <h1 className="page-title">Cluster</h1>
          <p className="page-subtitle">Nodes and actors from the latest Ray sync</p>
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
                  <th>Head</th>
                </tr>
              </thead>
              <tbody>
                {nodesQuery.data?.items.map((node) => (
                  <tr key={node.node_id}>
                    <td className="mono">{node.node_id}</td>
                    <td>{node.hostname ?? "—"}</td>
                    <td>
                      <span className="badge badge-pending">{node.state ?? "—"}</span>
                    </td>
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
                  <tr key={actor.actor_id}>
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
      </div>
    </main>
  );
}
