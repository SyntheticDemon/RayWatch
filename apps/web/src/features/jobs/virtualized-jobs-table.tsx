import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Link } from "react-router-dom";

import type { ColumnFilters } from "@/features/jobs/use-jobs-hub-filters";
import { DEFAULT_COLUMNS } from "@/features/jobs/use-jobs-hub-filters";
import type { JobSummary } from "@/shared/api/client";
import { formatDuration, formatWhen } from "@/shared/lib/time";
import { Input } from "@/shared/ui/primitives";

type Props = {
  rows: JobSummary[];
  columnFilters?: ColumnFilters;
  onColumnFiltersChange?: (filters: ColumnFilters) => void;
};

const GRID_COLS =
  "minmax(14rem, 1.4fr) minmax(12rem, 1.2fr) 7.5rem 7rem minmax(12rem, 1.6fr) minmax(10rem, 1.2fr) 9rem 9rem 6rem 5.5rem 8rem";

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function VirtualizedJobsTable({
  rows,
  columnFilters = DEFAULT_COLUMNS,
  onColumnFiltersChange,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const setCol = (patch: Partial<ColumnFilters>) => {
    onColumnFiltersChange?.({ ...columnFilters, ...patch });
  };

  if (rows.length === 0) {
    return (
      <div className="table-empty">
        <p>No jobs match these filters.</p>
      </div>
    );
  }

  return (
    <div className="data-table" ref={parentRef}>
      <div className="data-table-header jobs-grid" style={{ gridTemplateColumns: GRID_COLS }}>
        <span>Job ID</span>
        <span>Submission ID</span>
        <span>Status</span>
        <span>Type</span>
        <span>Entrypoint</span>
        <span>Message</span>
        <span>Started</span>
        <span>Ended</span>
        <span>Duration</span>
        <span>PID</span>
        <span>Tasks</span>
      </div>
      {onColumnFiltersChange && (
        <div className="data-table-col-filters jobs-grid" style={{ gridTemplateColumns: GRID_COLS }}>
          <Input className="col-filter-input" placeholder="Filter…" value={columnFilters.jobId} onChange={(e) => setCol({ jobId: e.target.value })} aria-label="Filter job ID column" />
          <Input className="col-filter-input" placeholder="Filter…" value={columnFilters.submissionId} onChange={(e) => setCol({ submissionId: e.target.value })} aria-label="Filter submission ID column" />
          <Input className="col-filter-input" placeholder="Filter…" value={columnFilters.status} onChange={(e) => setCol({ status: e.target.value })} aria-label="Filter status column" />
          <Input className="col-filter-input" placeholder="Filter…" value={columnFilters.jobType} onChange={(e) => setCol({ jobType: e.target.value })} aria-label="Filter job type column" />
          <Input className="col-filter-input" placeholder="Filter…" value={columnFilters.entrypoint} onChange={(e) => setCol({ entrypoint: e.target.value })} aria-label="Filter entrypoint column" />
          <Input className="col-filter-input" placeholder="Filter…" value={columnFilters.message} onChange={(e) => setCol({ message: e.target.value })} aria-label="Filter message column" />
          <span />
          <span />
          <span />
          <Input className="col-filter-input" placeholder="Filter…" value={columnFilters.driverPid} onChange={(e) => setCol({ driverPid: e.target.value })} aria-label="Filter driver PID column" />
          <span />
        </div>
      )}
      <div className="data-table-virtual" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => {
          const job = rows[item.index];
          return (
            <div
              key={job.job_id}
              className="data-table-row jobs-grid"
              style={{
                gridTemplateColumns: GRID_COLS,
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <Link to={`/jobs/${job.job_id}`} className="cell-link mono cell-job-name" title={job.job_id}>
                {job.job_id}
              </Link>
              <span className="mono cell-ellipsis" title={job.submission_id ?? ""}>{cell(job.submission_id)}</span>
              <span>
                <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
              </span>
              <span className="cell-muted">{cell(job.job_type)}</span>
              <span className="mono cell-ellipsis" title={job.entrypoint}>{cell(job.entrypoint)}</span>
              <span className="cell-ellipsis" title={job.error_message ?? ""}>{cell(job.error_message)}</span>
              <span className="cell-muted">{formatWhen(job.started_at)}</span>
              <span className="cell-muted">{formatWhen(job.ended_at)}</span>
              <span className="cell-muted">{formatDuration(job.started_at, job.ended_at)}</span>
              <span className="cell-muted cell-numeric">{cell(job.driver_pid)}</span>
              <span className="cell-muted cell-numeric">
                {job.task_running} / {job.task_failed} / {job.task_total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
