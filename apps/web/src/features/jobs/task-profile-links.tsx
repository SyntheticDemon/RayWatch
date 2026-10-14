import type { TaskSummary } from "@/shared/api/client";

const ACTIONS = [
  ["cpu-profile", "CPU profile"],
  ["traceback", "Stack trace"],
  ["memory-profile", "Memory profile"],
] as const;

export function TaskProfileLinks({ task }: { task: TaskSummary }) {
  const running = task.status === "RUNNING" && Boolean(task.node_id);
  const id = encodeURIComponent(task.task_id);
  return (
    <span className="task-profile-links">
      {ACTIONS.map(([path, label]) =>
        running ? (
          <a key={path} href={`/api/tasks/${id}/${path}`} target="_blank" rel="noreferrer">
            {label}
          </a>
        ) : (
          <span key={path} className="task-profile-disabled" title="Ray profiles the worker while the task is running">
            {label}
          </span>
        ),
      )}
    </span>
  );
}
