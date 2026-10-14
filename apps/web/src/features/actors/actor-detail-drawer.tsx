import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { fetchActorLogs, fetchClusterActor, killClusterActor } from "@/shared/api/client";
import { LogViewer } from "@/shared/ui/log-viewer";
import { Button } from "@/shared/ui/primitives";

type ActorDetailDrawerProps = {
  actorId: string;
  onClose: () => void;
};

export function ActorDetailDrawer({ actorId, onClose }: ActorDetailDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const queryClient = useQueryClient();
  const [killMessage, setKillMessage] = useState<string | null>(null);
  const [logsPaused, setLogsPaused] = useState(true);
  const actorQuery = useQuery({
    queryKey: ["cluster-actor", actorId],
    queryFn: () => fetchClusterActor(actorId),
  });
  const logsQuery = useQuery({
    queryKey: ["cluster-actor-logs", actorId],
    queryFn: () => fetchActorLogs(actorId),
    enabled: !!actorQuery.data?.actor,
  });
  const killMutation = useMutation({
    mutationFn: () => killClusterActor(actorId),
    onSuccess: (result) => {
      setKillMessage(result.message);
      queryClient.invalidateQueries({ queryKey: ["cluster-actors"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-actor", actorId] });
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const actor = actorQuery.data?.actor;

  return (
    <aside
      ref={panelRef}
      className="task-drawer actor-detail-drawer"
      role="dialog"
      aria-label="Actor detail"
      tabIndex={-1}
    >
      <div className="task-inspector-actions">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close actor (Esc)
        </Button>
        {actor?.state === "ALIVE" && (
          <Button
            variant="danger"
            size="sm"
            disabled={killMutation.isPending}
            onClick={() => killMutation.mutate()}
          >
            Kill actor
          </Button>
        )}
      </div>
      {killMessage && <p className="muted small">{killMessage}</p>}
      {actorQuery.isLoading ? (
        <p className="muted">Loading actor…</p>
      ) : actorQuery.error || !actor ? (
        <p className="error-banner">Could not load actor.</p>
      ) : (
        <div className="actor-detail">
          <h2 className="task-inspector-title">{actor.name || actor.class_name || actor.actor_id}</h2>
          <dl className="job-info-grid">
            <dt>Actor ID</dt>
            <dd className="mono">{actor.actor_id}</dd>
            <dt>Class</dt>
            <dd>{actor.class_name ?? "—"}</dd>
            <dt>State</dt>
            <dd>{actor.state ?? "—"}</dd>
            <dt>Job</dt>
            <dd>
              {actor.job_id ? (
                <Link to={`/jobs/${actor.job_id}`} className="text-link mono">{actor.job_id}</Link>
              ) : (
                "—"
              )}
            </dd>
            <dt>PID</dt>
            <dd>{actor.pid ?? "—"}</dd>
            <dt>Node</dt>
            <dd className="mono">{actor.node_id ?? "—"}</dd>
            <dt>Namespace</dt>
            <dd>{actor.ray_namespace ?? "—"}</dd>
            <dt>Restarts</dt>
            <dd>{actor.num_restarts ?? 0}</dd>
            <dt>Placement group</dt>
            <dd className="mono">{actor.placement_group_id ?? "—"}</dd>
          </dl>
          <section className="actor-logs-panel">
            <h3 className="pinned-tasks-title">Actor logs</h3>
            <p className="muted small">
              Worker log for pid {actor.pid ?? "—"} on {actor.node_id ?? "—"} (not cluster-wide).
            </p>
            {logsQuery.isLoading ? (
              <p className="muted">Loading logs…</p>
            ) : (
              <LogViewer
                text={logsQuery.data?.logs ?? ""}
                errorMessage={logsQuery.data?.error_message}
                pollPaused={logsPaused}
                onTogglePause={() => setLogsPaused((p) => !p)}
                onRefresh={() => logsQuery.refetch()}
                isRefreshing={logsQuery.isFetching}
              />
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
