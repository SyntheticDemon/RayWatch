import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { TaskInspector } from "@/features/jobs/task-inspector";
import { fetchTask } from "@/shared/api/client";
import { taskPageBreadcrumbs } from "@/shared/ui/breadcrumb-trail";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";

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
      <Breadcrumbs
        items={taskPageBreadcrumbs({
          jobId: task.job_id,
          taskId: task.task_id,
          taskLabel: task.name || task.func_or_class,
        })}
      />
      <TaskInspector task={task} showJobLink />
    </main>
  );
}
