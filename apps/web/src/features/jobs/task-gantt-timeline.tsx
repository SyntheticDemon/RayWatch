import type { TaskSummary } from "@/shared/api/client";

type TaskGanttTimelineProps = {
  tasks: TaskSummary[];
  focusTaskId?: string | null;
};

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function taskLabel(task: TaskSummary): string {
  return task.name || task.func_or_class || task.task_id.slice(0, 8);
}

export function buildGanttRange(tasks: TaskSummary[]): { start: number; end: number } | null {
  let start: number | null = null;
  let end: number | null = null;
  const now = Date.now();
  for (const task of tasks) {
    const t0 = parseTime(task.started_at);
    const t1 = parseTime(task.ended_at) ?? (task.status === "RUNNING" ? now : t0);
    if (t0 === null && t1 === null) continue;
    const left = t0 ?? t1!;
    const right = t1 ?? t0 ?? left;
    start = start === null ? left : Math.min(start, left);
    end = end === null ? right : Math.max(end, right);
  }
  if (start === null || end === null) return null;
  if (end <= start) end = start + 60_000;
  return { start, end };
}

export function TaskGanttTimeline({ tasks, focusTaskId }: TaskGanttTimelineProps) {
  const range = buildGanttRange(tasks);
  const schedulable = tasks.filter((task) => parseTime(task.started_at) !== null || parseTime(task.ended_at) !== null);

  if (!range || schedulable.length === 0) {
    return (
      <p className="muted small" data-testid="task-gantt-empty">
        No task timestamps yet — bars appear when Ray reports start/end times.
      </p>
    );
  }

  const span = range.end - range.start;
  const formatTick = (ms: number) => new Date(ms).toLocaleTimeString();

  return (
    <div className="task-gantt" aria-label="Task timeline">
      <div className="task-gantt-axis">
        <span>{formatTick(range.start)}</span>
        <span>{formatTick(range.end)}</span>
      </div>
      <ul className="task-gantt-rows">
        {schedulable.map((task) => {
          const t0 = parseTime(task.started_at) ?? range.start;
          const t1 =
            parseTime(task.ended_at) ??
            (task.status === "RUNNING" ? Date.now() : t0);
          const left = ((t0 - range.start) / span) * 100;
          const width = Math.max(0.8, ((Math.max(t1, t0) - t0) / span) * 100);
          const focused = focusTaskId === task.task_id;
          return (
            <li key={task.task_id} className={focused ? "task-gantt-row-focused" : undefined}>
              <span className="task-gantt-label" title={task.task_id}>
                {taskLabel(task)}
              </span>
              <div className="task-gantt-track">
                <div
                  className={`task-gantt-bar task-gantt-bar-${task.status.toLowerCase()}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${task.status} · ${task.task_id}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
