import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { TaskAttemptTimeline } from "@/features/jobs/task-attempt-timeline";
import { usePinnedTasks } from "@/features/jobs/use-pinned-tasks";
import { fetchJobTasks, type TaskSummary } from "@/shared/api/client";
import { ActorCard } from "@/shared/ui/actor-card";
import { TaskProfileLinks } from "@/features/jobs/task-profile-links";
import { Button } from "@/shared/ui/primitives";
import { WorkerCard } from "@/shared/ui/worker-card";

type TaskInspectorProps = {
  task: TaskSummary;
  showJobLink?: boolean;
};

export function TaskInspector({ task, showJobLink }: TaskInspectorProps) {
  const { isPinned, togglePin } = usePinnedTasks(task.job_id);
  const pinned = isPinned(task.task_id);
  const jobTasksQuery = useQuery({
    queryKey: ["job-tasks", task.job_id, "timeline"],
    queryFn: () => fetchJobTasks(task.job_id),
  });
  const childrenQuery = useQuery({
    queryKey: ["job-tasks", task.job_id, "children", task.task_id],
    queryFn: () => fetchJobTasks(task.job_id),
    select: (page) => page.items.filter((row) => row.parent_task_id === task.task_id),
  });

  return (
    <div className="task-inspector">
      <header className="task-inspector-header">
        <h2 className="task-inspector-title">{task.name || task.func_or_class || "Task"}</h2>
        <div className="task-inspector-actions">
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={pinned}
            onClick={() => togglePin(task.task_id)}
          >
            {pinned ? "Unpin task" : "Pin task"}
          </Button>
          <TaskProfileLinks task={task} />
          {showJobLink && (
            <Link to={`/jobs/${task.job_id}?task=${task.task_id}`} className="text-link small">
              View in job context
            </Link>
          )}
        </div>
      </header>
      <TaskAttemptTimeline task={task} jobTasks={jobTasksQuery.data?.items} />
      <div className="entity-card-row">
        <WorkerCard workerId={task.worker_id} activeTaskId={task.task_id} />
        <ActorCard actorId={task.actor_id} />
      </div>
      <dl className="meta-grid">
        <dt>Task ID</dt>
        <dd className="mono">{task.task_id}</dd>
        <dt>Job</dt>
        <dd>
          <Link to={`/jobs/${task.job_id}`} className="text-link mono">{task.job_id}</Link>
        </dd>
        <dt>Status</dt>
        <dd>{task.status}</dd>
        <dt>Function</dt>
        <dd className="mono">{task.func_or_class || "—"}</dd>
        <dt>Parent task</dt>
        <dd className="mono">
          {task.parent_task_id ? (
            <Link to={`/tasks/${task.parent_task_id}`} className="text-link">
              {task.parent_task_id}
            </Link>
          ) : (
            "—"
          )}
        </dd>
        {task.error_message && (
          <>
            <dt>Error</dt>
            <dd>{task.error_message}</dd>
          </>
        )}
      </dl>
      {childrenQuery.data && childrenQuery.data.length > 0 && (
        <section className="task-inspector-children">
          <h3 className="task-inspector-subtitle">Child tasks</h3>
          <ul className="task-child-list">
            {childrenQuery.data.map((child) => (
              <li key={child.task_id}>
                <Link
                  to={`/tasks/${child.task_id}`}
                  className="text-link"
                >
                  {child.name || child.func_or_class || child.task_id.slice(0, 12)}
                </Link>
                <span className="muted"> · {child.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
