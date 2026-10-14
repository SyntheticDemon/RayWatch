import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { JobResponse, JobSummary, SyncMeta, TaskSummary, TasksPage } from "@/shared/api/client";

type LiveSyncMessage = {
  type?: string;
  sync?: SyncMeta;
  job?: JobResponse["job"];
  jobs_preview?: JobSummary[];
  tasks_preview?: TaskSummary[];
};

type UseLiveSyncOptions = {
  onSync?: () => void;
  onJobsPreview?: (jobs: JobSummary[], sync: SyncMeta) => void;
};

export function useLiveSync(jobId?: string, options?: UseLiveSyncOptions) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const onSyncRef = useRef(options?.onSync);
  const onJobsPreviewRef = useRef(options?.onJobsPreview);
  onSyncRef.current = options?.onSync;
  onJobsPreviewRef.current = options?.onJobsPreview;

  useEffect(() => {
    const path = jobId ? `/ws/live?job_id=${encodeURIComponent(jobId)}` : "/ws/live";
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}${path}`;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      ws = new WebSocket(url);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        retry = setTimeout(connect, 3000);
      };
      ws.onmessage = (event) => {
        let message: LiveSyncMessage | null = null;
        try {
          message = JSON.parse(event.data as string) as LiveSyncMessage;
        } catch {
          message = null;
        }

        if (message?.type === "sync") {
          onSyncRef.current?.();
          if (!jobId) {
            const preview = message.jobs_preview;
            const sync = message.sync;
            if (preview?.length && sync) {
              onJobsPreviewRef.current?.(preview, sync);
              queryClient.setQueriesData(
                { predicate: (q) => q.queryKey[0] === "jobs" },
                (old: { items?: JobSummary[]; sync?: SyncMeta } | undefined) => {
                  if (!old?.items?.length) return old;
                  const byId = new Map(preview.map((job) => [job.job_id, job]));
                  return {
                    ...old,
                    items: old.items.map((job) => byId.get(job.job_id) ?? job),
                    sync,
                  };
                },
              );
            } else {
              queryClient.invalidateQueries({ queryKey: ["jobs"] });
            }
            queryClient.invalidateQueries({ queryKey: ["cluster-overview"] });
            queryClient.invalidateQueries({ queryKey: ["cluster-nodes"] });
            queryClient.invalidateQueries({ queryKey: ["cluster-actors"] });
          } else if (message.job) {
            queryClient.setQueryData<JobResponse>(["job", jobId], (prev) => {
              const sync = message.sync ?? prev?.sync;
              if (!sync) return prev;
              return { job: message.job!, sync };
            });
            const tasksPreview = message.tasks_preview;
            if (tasksPreview?.length) {
              queryClient.setQueriesData<TasksPage>(
                { predicate: (q) => q.queryKey[0] === "job-tasks" && q.queryKey[1] === jobId },
                (old) => {
                  if (!old) return old;
                  const byId = new Map(tasksPreview.map((task) => [task.task_id, task]));
                  const merged = old.items.map((task) => byId.get(task.task_id) ?? task);
                  for (const task of tasksPreview) {
                    if (!merged.some((row) => row.task_id === task.task_id)) {
                      merged.push(task);
                    }
                  }
                  return {
                    ...old,
                    items: merged,
                    sync: message.sync ?? old.sync,
                  };
                },
              );
              for (const task of tasksPreview) {
                queryClient.setQueryData(
                  ["task", task.task_id],
                  (prev: { task: TaskSummary; sync: SyncMeta } | undefined) => {
                    if (!prev) return prev;
                    return { task, sync: message.sync ?? prev.sync };
                  },
                );
              }
            } else {
              queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
            }
          } else {
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
          }
          return;
        }

        queryClient.invalidateQueries({ queryKey: jobId ? ["job", jobId] : ["jobs"] });
        if (jobId) {
          queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
        }
      };
    };

    connect();
    return () => {
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [jobId, queryClient]);

  return { connected };
}
