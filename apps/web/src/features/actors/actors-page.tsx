import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { fetchClusterActors, triggerSync } from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";
import { Button } from "@/shared/ui/primitives";
import { SyncStatus } from "@/shared/ui/sync-status";

export function ActorsPage() {
  const queryClient = useQueryClient();
  const { connected } = useLiveSync();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("id");
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
                  <td className="mono">
                    {actor.job_id ? (
                      <Link to={`/jobs/${actor.job_id}`} className="text-link">
                        {actor.job_id}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
