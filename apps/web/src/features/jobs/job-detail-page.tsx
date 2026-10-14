import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { TaskDrawer } from "@/features/jobs/task-drawer";
import { TaskTree } from "@/features/jobs/task-tree";
import { fetchJob, fetchJobTasks, fetchTask, stopJob, triggerSync } from "@/shared/api/client";
import { useJobLogs } from "@/shared/hooks/use-job-logs";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Button } from "@/shared/ui/primitives";
import { LogViewer } from "@/shared/ui/log-viewer";
import { jobDetailBreadcrumbs } from "@/shared/ui/breadcrumb-trail";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";
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
  const logLineRaw = searchParams.get("log_line");
  const highlightLogLine = logLineRaw ? Number.parseInt(logLineRaw, 10) : null;
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

  const {
    text: logText,
    errorMessage: logError,
    loading: logsLoading,
    fetching: logsFetching,
    streaming: logsStreaming,
    refresh: refreshLogs,
  } = useJobLogs(jobId, {
    paused: logsPaused,
    pollMs: 5000,
    clusterEpoch: jobQuery.data?.sync.cluster_epoch,
  });

  const tasksQuery = useInfiniteQuery({
    queryKey: ["job-tasks", jobId],
    queryFn: ({ pageParam }) => fetchJobTasks(jobId, pageParam),
    enabled: Boolean(jobId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    refetchInterval: connected ? false : 5000,
  });

  const tasks = tasksQuery.data?.pages.flatMap((page) => page.items) ?? [];

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
  const sync = jobQuery.data.sync;
  const selectedTask = selectedTaskId
    ? (tasks.find((t) => t.task_id === selectedTaskId) ?? taskQuery.data?.task)
    : undefined;

  return (
    <main className="job-detail">
      <Breadcrumbs
        items={jobDetailBreadcrumbs({
          jobId: job.job_id,
          entrypoint: job.entrypoint,
          taskId: selectedTaskId,
          taskLabel: selectedTask?.name || selectedTask?.func_or_class,
        })}
      />
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
        <h2>Nested runs</h2>
        {tasksQuery.isLoading ? (
          <p className="muted">Loading tasks…</p>
        ) : (
          <>
            <TaskTree
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelect={(id) => setSearchParams({ task: id })}
            />
            {tasksQuery.hasNextPage && (
              <div className="panel-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={tasksQuery.isFetchingNextPage}
                  onClick={() => tasksQuery.fetchNextPage()}
                >
                  {tasksQuery.isFetchingNextPage ? "Loading more tasks…" : "Load more tasks"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {selectedTaskId && taskQuery.data && (
        <TaskDrawer task={taskQuery.data.task} onClose={() => setSearchParams({})} />
      )}

      <section className="panel">
        <h2>{selectedTaskId ? "Task logs (filtered)" : "Job logs"}</h2>
        <p className="muted" style={{ marginTop: "-0.25rem", marginBottom: "0.75rem" }}>
          {logsStreaming
            ? "Live tail via Ray log WebSocket (recent history loaded over HTTP first)."
            : "Tails the latest lines first, then polls for new content."}
        </p>
        {logsLoading ? (
          <p className="muted">Loading logs…</p>
        ) : (
          <LogViewer
            text={filterLogsForTask(logText, selectedTaskId)}
            errorMessage={logError}
            pollPaused={logsPaused}
            followTail={!logsPaused && !highlightLogLine}
            onTogglePause={() => setLogsPaused((p) => !p)}
            onRefresh={() => refreshLogs()}
            isRefreshing={logsFetching}
            deepLinkPath={`/jobs/${jobId}`}
            deepLinkQuery={selectedTaskId ? { task: selectedTaskId } : undefined}
            highlightLine={highlightLogLine}
          />
        )}
      </section>
    </main>
  );
}
