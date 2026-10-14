import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Link } from "react-router-dom";

import type { JobSummary } from "@/shared/api/client";
import { formatDuration, formatWhen } from "@/shared/lib/time";

type Props = {
  rows: JobSummary[];
};

export function VirtualizedJobsTable({ rows }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  return (
    <div className="jobs-table-virtual" ref={parentRef}>
      <table className="jobs-table">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Status</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Entrypoint</th>
            <th>Tasks</th>
          </tr>
        </thead>
      </table>
      <div className="jobs-table-body" style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const job = rows[item.index];
          return (
            <div
              key={job.job_id}
              className="jobs-table-row"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <Link to={`/jobs/${job.job_id}`} className="mono">{job.job_id}</Link>
              <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
              <span className="muted">{formatWhen(job.started_at)}</span>
              <span className="muted">{formatDuration(job.started_at, job.ended_at)}</span>
              <span className="mono truncate">{job.entrypoint}</span>
              <span>
                {job.task_running} run / {job.task_failed} fail / {job.task_total} total
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
