import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  apiStartedAfter,
  apiStartedBefore,
  useJobsHubFilters,
} from "@/features/jobs/use-jobs-hub-filters";
import { VirtualizedJobsTable } from "@/features/jobs/virtualized-jobs-table";
import { mergeJobRows } from "@/shared/lib/merge-jobs-preview";
import { fetchJobs, triggerSync, type JobSummary, type SyncMeta } from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Button, Checkbox, Field, Input, SearchField, Select } from "@/shared/ui/primitives";
import { SyncStatus } from "@/shared/ui/sync-status";

const STATUS_CHIPS = ["", "RUNNING", "FAILED", "SUCCEEDED"] as const;

export function JobsPage() {
  const filters = useJobsHubFilters();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<JobSummary[]>([]);
  const queryClient = useQueryClient();
  const allowWsNewRows = filters.timePreset === "all" && !cursor;
  const { connected } = useLiveSync(undefined, {
    onJobsPreview: (preview, sync) => {
      setRows((prev) => mergeJobRows(prev, preview, { allowNewRows: allowWsNewRows }));
      queryClient.setQueriesData(
        { predicate: (q) => q.queryKey[0] === "jobs" },
        (old: { sync?: SyncMeta } | undefined) => (old ? { ...old, sync } : old),
      );
    },
  });

  const filterKey = [
    filters.debouncedQ,
    filters.status,
    filters.sort,
    filters.failed24h,
    filters.timePreset,
    filters.timePreset === "custom" ? filters.startedAfter : "",
    filters.timePreset === "custom" ? filters.startedBefore : "",
    filters.includeArchived,
    filters.jobKind,
    filters.columnFilters.jobId,
    filters.columnFilters.submissionId,
    filters.columnFilters.status,
    filters.columnFilters.jobType,
    filters.columnFilters.entrypoint,
    filters.columnFilters.message,
    filters.columnFilters.driverPid,
  ].join("|");

  const [appliedFilter, setAppliedFilter] = useState(filterKey);
  if (appliedFilter !== filterKey) {
    setAppliedFilter(filterKey);
    setCursor(undefined);
  }

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: [
      "jobs",
      filters.debouncedQ,
      filters.status,
      filters.sort,
      filters.failed24h,
      filters.timePreset,
      filters.timePreset === "custom" ? filters.startedAfter : "",
      filters.timePreset === "custom" ? filters.startedBefore : "",
      filters.includeArchived,
      filters.jobKind,
      cursor ?? "",
    ],
    queryFn: () =>
      fetchJobs({
        status: filters.failed24h ? "FAILED" : filters.status || undefined,
        q: filters.debouncedQ || undefined,
        sort: filters.sort,
        cursor,
        limit: 50,
        include_archived: filters.includeArchived || undefined,
        failed_within_hours: filters.failed24h ? 24 : undefined,
        started_after: apiStartedAfter(filters.timePreset, filters.startedAfter),
        started_before: apiStartedBefore(filters.timePreset, filters.startedBefore),
        job_kind:
          filters.jobKind === "submission" || filters.jobKind === "internal"
            ? filters.jobKind
            : undefined,
      }),
    refetchInterval: connected ? false : 5000,
  });

  useEffect(() => {
    if (!data) return;
    if (!cursor) {
      setRows(data.items);
    } else {
      setRows((prev) => {
        const ids = new Set(prev.map((j) => j.job_id));
        const merged = [...prev];
        for (const job of data.items) {
          if (!ids.has(job.job_id)) merged.push(job);
        }
        return merged;
      });
    }
  }, [data, cursor]);

  const displayRows = filters.applyColumnFilters(rows);

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const showInitialLoad = isLoading && rows.length === 0;
  const showEmpty = !showInitialLoad && !error && displayRows.length === 0;

  return (
    <main className="jobs-page">
      <header className="page-title-row">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">
            Ray cluster workloads ·{" "}
            <Link to="/internal-runs" className="text-link">Internal runs</Link>
          </p>
        </div>
        <div className="page-title-actions">
          <SyncStatus sync={data?.sync} connected={connected} />
          <Button
            variant="primary"
            size="sm"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {syncMutation.isPending ? "Syncing…" : "Sync from Ray"}
          </Button>
        </div>
      </header>

      <section className="toolbar-card" aria-label="Filters">
        <div className="toolbar-row toolbar-row-primary">
          <SearchField
            placeholder="Search by job ID or entrypoint…"
            value={filters.qInput}
            onChange={(e) => filters.setQ(e.target.value)}
            className="toolbar-search"
            aria-label="Search jobs"
          />
          <Field label="Sort by" className="toolbar-field">
            <Select value={filters.sort} onChange={(e) => filters.setSort(e.target.value)}>
              <option value="job_id">Job ID</option>
              <option value="started_at">Started</option>
              <option value="status">Status</option>
            </Select>
          </Field>
          <Field label="Job kind" className="toolbar-field">
            <Select
              value={filters.jobKind}
              onChange={(e) => filters.setJobKind(e.target.value as typeof filters.jobKind)}
            >
              <option value="all">All jobs</option>
              <option value="submission">Submissions</option>
              <option value="internal">Internal / driver</option>
            </Select>
          </Field>
        </div>
        <div className="toolbar-row toolbar-row-secondary">
          <div className="segmented" role="group" aria-label="Time range">
            {(
              [
                ["all", "All time"],
                ["1h", "Last 1 hour"],
                ["24h", "Last 24 hours"],
                ["7d", "Last 7 days"],
                ["custom", "Custom"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`segment ${filters.timePreset === key ? "segment-active" : ""}`}
                onClick={() => filters.setTimePreset(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {filters.timePreset === "custom" && (
          <div className="toolbar-row toolbar-row-primary">
            <Field label="Started after" className="toolbar-field">
              <Input
                type="datetime-local"
                value={filters.startedAfter.slice(0, 16)}
                onChange={(e) =>
                  filters.setStartedAfter(e.target.value ? new Date(e.target.value).toISOString() : "")
                }
              />
            </Field>
            <Field label="Started before" className="toolbar-field">
              <Input
                type="datetime-local"
                value={filters.startedBefore.slice(0, 16)}
                onChange={(e) =>
                  filters.setStartedBefore(
                    e.target.value ? new Date(e.target.value).toISOString() : "",
                  )
                }
              />
            </Field>
          </div>
        )}
        <div className="toolbar-row toolbar-row-secondary">
          <div className="segmented" role="group" aria-label="Status filter">
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip || "all"}
                type="button"
                className={`segment ${!filters.failed24h && filters.status === chip ? "segment-active" : ""}`}
                onClick={() => filters.setStatus(chip)}
              >
                {chip || "All"}
              </button>
            ))}
            <button
              type="button"
              className={`segment ${filters.failed24h ? "segment-active" : ""}`}
              onClick={() => filters.setFailed24h()}
            >
              Failed (24h)
            </button>
          </div>
          <Checkbox
            label="Include archived"
            checked={filters.includeArchived}
            onChange={(checked) => filters.setIncludeArchived(checked)}
          />
        </div>
      </section>

      {error && (
        <p className="error-banner">Could not load jobs. Is the API running on port 8080?</p>
      )}

      <section className="table-card">
        {showInitialLoad ? (
          <p className="table-card-loading">Loading jobs…</p>
        ) : showEmpty ? (
          <p className="table-card-loading">
            {filters.debouncedQ
              ? `No jobs match “${filters.debouncedQ}”.`
              : "No jobs match these filters."}
          </p>
        ) : (
          <VirtualizedJobsTable
            rows={displayRows}
            columnFilters={filters.columnFilters}
            onColumnFiltersChange={filters.setColumnFilters}
          />
        )}
        {isFetching && !showInitialLoad && (
          <p className="muted small">Updating results…</p>
        )}
        {data?.next_cursor && (
          <footer className="table-footer">
            <Button
              variant="secondary"
              size="sm"
              disabled={isFetching}
              onClick={() => setCursor(data.next_cursor!)}
            >
              {isFetching ? "Loading…" : "Load more"}
            </Button>
          </footer>
        )}
      </section>
    </main>
  );
}
