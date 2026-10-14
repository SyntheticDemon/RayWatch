import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { fetchClusterActor } from "@/shared/api/client";

type ActorCardProps = {
  actorId: string | null;
};

export function ActorCard({ actorId }: ActorCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cluster-actor", actorId],
    queryFn: () => fetchClusterActor(actorId!),
    enabled: Boolean(actorId),
    retry: false,
  });

  if (!actorId) {
    return <p className="muted">No actor assigned.</p>;
  }

  const actor = data?.actor;
  const clusterActorUrl = `/cluster?focus=actor&id=${encodeURIComponent(actorId)}`;
  const clusterNodeUrl =
    actor?.node_id ? `/cluster?focus=node&id=${encodeURIComponent(actor.node_id)}` : null;

  return (
    <div className="entity-card">
      <h4>Actor</h4>
      {isLoading && <p className="muted small">Loading actor from cluster index…</p>}
      {error && !actor && (
        <p className="muted small">
          Actor not in live index.{" "}
          <Link to={clusterActorUrl} className="text-link">
            Open cluster
          </Link>
        </p>
      )}
      <dl className="meta-grid compact">
        <dt>Actor ID</dt>
        <dd className="mono">
          <Link to={clusterActorUrl} className="text-link">
            {actorId}
          </Link>
        </dd>
        {actor?.class_name && (
          <>
            <dt>Class</dt>
            <dd>{actor.class_name}</dd>
          </>
        )}
        {actor?.state && (
          <>
            <dt>State</dt>
            <dd>{actor.state}</dd>
          </>
        )}
        {actor?.node_id && clusterNodeUrl && (
          <>
            <dt>Node</dt>
            <dd className="mono">
              <Link to={clusterNodeUrl} className="text-link">
                {actor.node_id.slice(0, 12)}…
              </Link>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
