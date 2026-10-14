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
  "minmax(7rem, 1.1fr) 6.5rem 8.5rem 5.5rem minmax(10rem, 2fr) minmax(8rem, 1fr)";

export function VirtualizedJobsTable({
  rows,
  columnFilters = DEFAULT_COLUMNS,
  onColumnFiltersChange,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
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
      <div className="data-table-header" style={{ gridTemplateColumns: GRID_COLS }}>
        <span>Job ID</span>
        <span>Status</span>
        <span>Started</span>
        <span>Duration</span>
        <span>Entrypoint</span>
        <span>Tasks</span>
      </div>
      {onColumnFiltersChange && (
        <div className="data-table-col-filters" style={{ gridTemplateColumns: GRID_COLS }}>
          <Input
            className="col-filter-input"
            placeholder="Filter…"
            value={columnFilters.jobId}
            onChange={(e) => setCol({ jobId: e.target.value })}
            aria-label="Filter job ID column"
          />
          <Input
            className="col-filter-input"
            placeholder="Filter…"
            value={columnFilters.status}
            onChange={(e) => setCol({ status: e.target.value })}
            aria-label="Filter status column"
          />
          <span />
          <span />
          <Input
            className="col-filter-input"
            placeholder="Filter…"
            value={columnFilters.entrypoint}
            onChange={(e) => setCol({ entrypoint: e.target.value })}
            aria-label="Filter entrypoint column"
          />
          <span />
        </div>
      )}
      <div className="data-table-virtual" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => {
          const job = rows[item.index];
          return (
            <div
              key={job.job_id}
              className="data-table-row"
              style={{
                gridTemplateColumns: GRID_COLS,
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <Link to={`/jobs/${job.job_id}`} className="cell-link mono">
                {job.job_id}
              </Link>
              <span>
                <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
              </span>
              <span className="cell-muted">{formatWhen(job.started_at)}</span>
              <span className="cell-muted">{formatDuration(job.started_at, job.ended_at)}</span>
              <span className="mono cell-ellipsis" title={job.entrypoint}>{job.entrypoint}</span>
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
