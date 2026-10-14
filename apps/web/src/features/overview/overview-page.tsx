import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { fetchClusterOverview, triggerSync } from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Button } from "@/shared/ui/primitives";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";
import { SyncStatus } from "@/shared/ui/sync-status";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function formatGiB(bytes: number): string {
  if (!bytes) return "—";
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
}

export function OverviewPage() {
  const queryClient = useQueryClient();
  const { connected } = useLiveSync();
  const overviewQuery = useQuery({
    queryKey: ["cluster-overview"],
    queryFn: fetchClusterOverview,
    refetchInterval: connected ? false : 8000,
  });
  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cluster-overview"] }),
  });
  const overview = overviewQuery.data?.overview;
  const sync = overviewQuery.data?.sync;
  const memoryTotal =
    overview?.utilization?.memory_bytes_total ?? overview?.memory_bytes_total ?? 0;

  return (
    <main>
      <Breadcrumbs items={[{ label: "Overview", to: "/overview" }]} />
      <header className="page-title-row">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Cluster snapshot (Ray Dashboard parity)</p>
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
        <div className="cluster-summary" role="region" aria-label="Overview summary">
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Jobs indexed</span>
            <span className="cluster-summary-value">
              <Link to="/" className="cell-link">{overview.job_count}</Link>
            </span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Tasks indexed</span>
            <span className="cluster-summary-value">{overview.task_count}</span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Nodes alive</span>
            <span className="cluster-summary-value">
              <Link to="/cluster" className="cell-link">
                {overview.nodes_alive} / {overview.nodes_total}
              </Link>
            </span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Actors</span>
            <span className="cluster-summary-value">
              <Link to="/actors" className="cell-link">{overview.actors_total}</Link>
            </span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Objects</span>
            <span className="cluster-summary-value">{overview.objects_total}</span>
          </div>
          <div className="cluster-summary-card">
            <span className="cluster-summary-label">Memory</span>
            <span className="cluster-summary-value">{formatGiB(memoryTotal)}</span>
          </div>
        </div>
      )}

      <p className="page-subtitle">
        <Link to="/cluster">Cluster detail</Link> · <Link to="/">Jobs hub</Link>
      </p>
    </main>
  );
}
