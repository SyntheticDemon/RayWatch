import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { fetchClusterNode } from "@/shared/api/client";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";

function formatGiB(bytes: number): string {
  if (!bytes) return "—";
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
}

export function NodeDetailPage() {
  const { nodeId = "" } = useParams();
  const nodeQuery = useQuery({
    queryKey: ["cluster-node", nodeId],
    queryFn: () => fetchClusterNode(nodeId),
    enabled: Boolean(nodeId),
  });
  const node = nodeQuery.data?.node;

  return (
    <main className="cluster-page">
      <Breadcrumbs
        items={[
          { label: "Cluster", to: "/cluster" },
          { label: nodeId ? `${nodeId.slice(0, 12)}…` : "Node", to: `/cluster/nodes/${nodeId}` },
        ]}
      />
      <header className="page-title-row">
        <h1 className="page-title">Node</h1>
      </header>
      {nodeQuery.isLoading && <p>Loading…</p>}
      {nodeQuery.error && <p className="error-banner">Node not found.</p>}
      {node && (
        <dl className="detail-grid">
          <dt>Node ID</dt>
          <dd className="mono">{node.node_id}</dd>
          <dt>Hostname</dt>
          <dd>{node.hostname ?? "—"}</dd>
          <dt>State</dt>
          <dd>{node.state ?? "—"}</dd>
          <dt>Head node</dt>
          <dd>{node.is_head ? "Yes" : "No"}</dd>
          <dt>CPUs</dt>
          <dd>{node.cpu_total ?? "—"}</dd>
          <dt>GPUs</dt>
          <dd>{node.gpu_total ?? "—"}</dd>
          <dt>Memory</dt>
          <dd>{formatGiB(node.memory_bytes_total ?? 0)}</dd>
        </dl>
      )}
      <p>
        <Link to="/cluster" className="text-link">Back to cluster</Link>
        {" · "}
        <Link to="/actors" className="text-link">Actors</Link>
      </p>
    </main>
  );
}
