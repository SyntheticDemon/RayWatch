import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { TaskInspector } from "@/features/jobs/task-inspector";
import { fetchTask } from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { SyncStatus } from "@/shared/ui/sync-status";
import { taskPageBreadcrumbs } from "@/shared/ui/breadcrumb-trail";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";

export function TaskDetailPage() {
  const { taskId = "" } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId),
    enabled: Boolean(taskId),
  });

  const jobIdForWs = data?.task.job_id;
  const { connected } = useLiveSync(jobIdForWs);

  if (isLoading) return <p className="muted">Loading task…</p>;
  if (error || !data) return <p className="error">Task not found.</p>;

  const task = data.task;
  return (
    <main>
      <Breadcrumbs
        items={taskPageBreadcrumbs({
          jobId: task.job_id,
          taskId: task.task_id,
          taskLabel: task.name || task.func_or_class,
        })}
      />
      <div className="page-title-actions" style={{ marginBottom: "1rem" }}>
        <SyncStatus sync={data.sync} connected={connected} />
      </div>
      <TaskInspector task={task} showJobLink />
    </main>
  );
}
