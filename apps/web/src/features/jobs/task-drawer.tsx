import { useEffect, useRef } from "react";

import { TaskInspector } from "@/features/jobs/task-inspector";
import type { TaskSummary } from "@/shared/api/client";

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
      <TaskInspector task={task} />
    </aside>
  );
}
