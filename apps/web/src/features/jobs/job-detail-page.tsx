import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { TaskTree } from "@/features/jobs/task-tree";
import {
  fetchJob,
  fetchJobLogs,
  fetchJobTasks,
  fetchTask,
  stopJob,
  triggerSync,
} from "@/shared/api/client";
import { LogViewer } from "@/shared/ui/log-viewer";
import { SyncBanner } from "@/shared/ui/sync-banner";

export function JobDetailPage() {
  const { jobId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get("task");
  const [stopConfirm, setStopConfirm] = useState(false);
  const [logsPaused, setLogsPaused] = useState(false);
  const queryClient = useQueryClient();

  const jobQuery = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: 5000,
  });

  const tasksQuery = useQuery({
    queryKey: ["job-tasks", jobId],
    queryFn: () => fetchJobTasks(jobId),
    enabled: Boolean(jobId),
    refetchInterval: 5000,
  });

  const logsQuery = useQuery({
    queryKey: ["job-logs", jobId],
    queryFn: () => fetchJobLogs(jobId),
    enabled: Boolean(jobId),
    refetchInterval: logsPaused ? false : 5000,
  });

  const taskQuery = useQuery({
    queryKey: ["task", selectedTaskId],
    queryFn: () => fetchTask(selectedTaskId!),
    enabled: Boolean(selectedTaskId),
  });

  const stopMutation = useMutation({
    mutationFn: () => stopJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      setStopConfirm(false);
    },
  });

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  if (jobQuery.isLoading) {
    return <p className="muted">Loading job…</p>;
  }
  if (jobQuery.error || !jobQuery.data) {
    return <p className="error">Job not found or API unavailable.</p>;
  }

  const job = jobQuery.data.job;
  const tasks = tasksQuery.data?.items ?? [];
  const sync = jobQuery.data.sync;

  return (
    <main className="job-detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Jobs</Link>
        <span> / </span>
        <span>{job.job_id}</span>
        {selectedTaskId && (
          <>
            <span> / </span>
            <span className="mono">task</span>
          </>
        )}
      </nav>
      <header className="job-detail-header">
        <h1>{job.job_id}</h1>
        <div className="job-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            Refresh from Ray
          </button>
          {!stopConfirm ? (
            <button type="button" className="btn-danger" onClick={() => setStopConfirm(true)}>
              Stop job
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-danger"
                disabled={stopMutation.isPending}
                onClick={() => stopMutation.mutate()}
              >
                Confirm stop
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStopConfirm(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
      </header>
      <SyncBanner sync={sync} />
      {stopMutation.data && (
        <p className={stopMutation.data.accepted ? "muted" : "error"}>{stopMutation.data.message}</p>
      )}
      <p className="mono entrypoint">{job.entrypoint}</p>
      <dl className="meta-grid">
        <dt>Status</dt>
        <dd>{job.status}</dd>
        <dt>Tasks</dt>
        <dd>
          {job.task_running} running · {job.task_failed} failed · {job.task_total} total
        </dd>
        {Object.entries(job.metadata).map(([key, value]) => (
          <Fragment key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
      </dl>

      <section className="panel">
        <h2>Tasks</h2>
        {tasksQuery.isLoading ? (
          <p className="muted">Loading tasks…</p>
        ) : (
          <TaskTree
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelect={(id) => setSearchParams({ task: id })}
          />
        )}
      </section>

      {selectedTaskId && taskQuery.data && (
        <aside className="task-drawer" role="dialog" aria-label="Task detail">
          <button type="button" className="btn-secondary" onClick={() => setSearchParams({})}>
            Close task
          </button>
          <h3>Task</h3>
          <dl className="meta-grid">
            <dt>ID</dt>
            <dd className="mono">{taskQuery.data.task.task_id}</dd>
            <dt>Status</dt>
            <dd>{taskQuery.data.task.status}</dd>
            <dt>Worker</dt>
            <dd className="mono">{taskQuery.data.task.worker_id ?? "—"}</dd>
            <dt>Parent</dt>
            <dd className="mono">{taskQuery.data.task.parent_task_id ?? "—"}</dd>
            <dt>Attempts</dt>
            <dd>{taskQuery.data.task.attempt_count}</dd>
            {taskQuery.data.task.error_message && (
              <>
                <dt>Error</dt>
                <dd>{taskQuery.data.task.error_message}</dd>
              </>
            )}
          </dl>
        </aside>
      )}

      <section className="panel">
        <h2>Logs</h2>
        {logsQuery.isLoading ? (
          <p className="muted">Loading logs…</p>
        ) : (
          <LogViewer
            text={logsQuery.data?.logs ?? ""}
            errorMessage={logsQuery.data?.error_message}
            pollPaused={logsPaused}
            onTogglePause={() => setLogsPaused((p) => !p)}
          />
        )}
      </section>
    </main>
  );
}
