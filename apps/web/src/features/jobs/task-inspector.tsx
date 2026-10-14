import { Link } from "react-router-dom";

import { TaskAttemptTimeline } from "@/features/jobs/task-attempt-timeline";
import type { TaskSummary } from "@/shared/api/client";
import { ActorCard } from "@/shared/ui/actor-card";
import { WorkerCard } from "@/shared/ui/worker-card";

type TaskInspectorProps = {
  task: TaskSummary;
  showJobLink?: boolean;
};

export function TaskInspector({ task, showJobLink }: TaskInspectorProps) {
  return (
    <div className="task-inspector">
      <header className="task-inspector-header">
        <h2 className="task-inspector-title">{task.name || task.func_or_class || "Task"}</h2>
        {showJobLink && (
          <Link to={`/jobs/${task.job_id}?task=${task.task_id}`} className="text-link small">
            View in job context
          </Link>
        )}
      </header>
      <TaskAttemptTimeline task={task} />
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
    </div>
  );
}
