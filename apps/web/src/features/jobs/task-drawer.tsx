import { useEffect, useRef } from "react";

import { TaskAttemptTimeline } from "@/features/jobs/task-attempt-timeline";
import type { TaskSummary } from "@/shared/api/client";
import { WorkerCard } from "@/shared/ui/worker-card";

type TaskDrawerProps = {
  task: TaskSummary;
  onClose: () => void;
};

export function TaskDrawer({ task, onClose }: TaskDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      ref={panelRef}
      className="task-drawer"
      role="dialog"
      aria-label="Task detail"
      tabIndex={-1}
    >
      <button type="button" className="btn-secondary" onClick={onClose}>
        Close task (Esc)
      </button>
      <h3>{task.name || task.func_or_class || "Task"}</h3>
      <TaskAttemptTimeline task={task} />
      <WorkerCard workerId={task.worker_id} activeTaskId={task.task_id} />
      <dl className="meta-grid">
        <dt>ID</dt>
        <dd className="mono">{task.task_id}</dd>
        <dt>Status</dt>
        <dd>{task.status}</dd>
        <dt>Actor</dt>
        <dd className="mono">{task.actor_id ?? "—"}</dd>
        <dt>Parent</dt>
        <dd className="mono">{task.parent_task_id ?? "—"}</dd>
        {task.error_message && (
          <>
            <dt>Error</dt>
            <dd>{task.error_message}</dd>
          </>
        )}
      </dl>
    </aside>
  );
}
