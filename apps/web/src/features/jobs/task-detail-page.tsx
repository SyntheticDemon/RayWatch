import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { fetchTask } from "@/shared/api/client";

export function TaskDetailPage() {
  const { taskId = "" } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId),
    enabled: Boolean(taskId),
  });

  if (isLoading) return <p className="muted">Loading task…</p>;
  if (error || !data) return <p className="error">Task not found.</p>;

  const task = data.task;
  return (
    <main>
      <nav className="breadcrumbs">
        <Link to="/">Jobs</Link>
        <span> / </span>
        <Link to={`/jobs/${task.job_id}?task=${task.task_id}`}>{task.job_id}</Link>
        <span> / </span>
        <span className="mono">{task.task_id}</span>
      </nav>
      <h1>Task</h1>
      <dl className="meta-grid">
        <dt>Status</dt>
        <dd>{task.status}</dd>
        <dt>Worker</dt>
        <dd className="mono">{task.worker_id ?? "—"}</dd>
        <dt>Actor</dt>
        <dd className="mono">{task.actor_id ?? "—"}</dd>
      </dl>
    </main>
  );
}
