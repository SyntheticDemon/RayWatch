import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { TaskDrawer } from "@/features/jobs/task-drawer";
import { TaskTree } from "@/features/jobs/task-tree";
import {
  fetchJob,
  fetchJobLogs,
  fetchJobTasks,
  fetchTask,
  stopJob,
  triggerSync,
} from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Button } from "@/shared/ui/primitives";
import { LogViewer } from "@/shared/ui/log-viewer";
import { SyncStatus } from "@/shared/ui/sync-status";

function filterLogsForTask(logs: string, taskId: string | null): string {
  if (!taskId) return logs;
  const needle = taskId.toLowerCase();
  const lines = logs.split("\n").filter((line) => line.toLowerCase().includes(needle));
  return lines.length ? lines.join("\n") : logs;
}

export function JobDetailPage() {
  const { jobId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get("task");
  const [stopConfirm, setStopConfirm] = useState(false);
  const [logsPaused, setLogsPaused] = useState(false);
  const queryClient = useQueryClient();
  const { connected } = useLiveSync(jobId);

  const jobQuery = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: connected ? false : 5000,
  });

  const tasksQuery = useQuery({
    queryKey: ["job-tasks", jobId],
    queryFn: () => fetchJobTasks(jobId),
    enabled: Boolean(jobId),
    refetchInterval: connected ? false : 5000,
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      if (result.accepted) {
        setStopConfirm(false);
      }
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
        <div className="page-title-actions">
          <SyncStatus sync={sync} connected={connected} compact />
          <Button
            variant="secondary"
            size="sm"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            Sync from Ray
          </Button>
          {!stopConfirm ? (
            <Button variant="danger" size="sm" onClick={() => setStopConfirm(true)}>
              Stop job
            </Button>
          ) : (
            <>
              <Button
                variant="danger"
                size="sm"
                disabled={stopMutation.isPending}
                onClick={() => stopMutation.mutate()}
              >
                Confirm stop
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setStopConfirm(false)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </header>
      {(stopMutation.data || stopMutation.isError) && (
        <p
          className={
            stopMutation.isError || (stopMutation.data && !stopMutation.data.accepted)
              ? "error-banner"
              : "notice-banner"
          }
          role="status"
        >
          {stopMutation.isError
            ? stopMutation.error instanceof Error
              ? stopMutation.error.message
              : "Stop request failed"
            : stopMutation.data?.message}
        </p>
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
        <TaskDrawer task={taskQuery.data.task} onClose={() => setSearchParams({})} />
      )}

      <section className="panel">
        <h2>{selectedTaskId ? "Task logs (filtered)" : "Job logs"}</h2>
        {logsQuery.isLoading ? (
          <p className="muted">Loading logs…</p>
        ) : (
          <LogViewer
            text={filterLogsForTask(logsQuery.data?.logs ?? "", selectedTaskId)}
            errorMessage={logsQuery.data?.error_message}
            pollPaused={logsPaused}
            onTogglePause={() => setLogsPaused((p) => !p)}
            onRefresh={() => logsQuery.refetch()}
            isRefreshing={logsQuery.isFetching}
          />
        )}
      </section>
    </main>
  );
}
