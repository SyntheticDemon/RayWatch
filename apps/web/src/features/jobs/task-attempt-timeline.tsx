import type { TaskSummary } from "@/shared/api/client";

const STEPS = ["PENDING", "RUNNING", "FINISHED", "FAILED"] as const;

function stepIndex(status: string): number {
  const upper = status.toUpperCase();
  if (upper === "FAILED") return 3;
  if (upper === "FINISHED" || upper === "SUCCEEDED") return 2;
  if (upper === "RUNNING") return 1;
  return 0;
}

export function TaskAttemptTimeline({ task }: { task: TaskSummary }) {
  const active = stepIndex(task.status);
  const attempts = Math.max(1, task.attempt_count);

  return (
    <div className="attempt-timeline" aria-label="Task state timeline">
      <p className="muted small">
        Attempts: {attempts}
        {task.started_at ? ` · started ${new Date(task.started_at).toLocaleString()}` : ""}
      </p>
      <ol className="timeline-steps">
        {STEPS.map((step, idx) => (
          <li key={step} className={idx <= active ? "timeline-step-active" : ""}>
            <span className="timeline-dot" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {attempts > 1 && (
        <ul className="attempt-list">
          {Array.from({ length: attempts }, (_, i) => (
            <li key={i}>
              Attempt {i + 1}
              {i + 1 === attempts ? ` · ${task.status}` : " · prior"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
