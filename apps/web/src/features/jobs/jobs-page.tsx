import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { VirtualizedJobsTable } from "@/features/jobs/virtualized-jobs-table";
import { fetchJobs, triggerSync, type JobSummary } from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { Button, Checkbox, Field, Input, SearchField, Select } from "@/shared/ui/primitives";
import { SyncStatus } from "@/shared/ui/sync-status";

const STATUS_CHIPS = ["", "RUNNING", "FAILED", "SUCCEEDED"] as const;

export function JobsPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [failed24h, setFailed24h] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<JobSummary[]>([]);
  const [sort, setSort] = useState<"job_id" | "started_at" | "status">("job_id");
  const [startedAfter, setStartedAfter] = useState("");
  const [startedBefore, setStartedBefore] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const queryClient = useQueryClient();
  const { connected } = useLiveSync();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: [
      "jobs",
      status,
      q,
      sort,
      failed24h,
      startedAfter,
      startedBefore,
      includeArchived,
      cursor ?? "",
    ],
    queryFn: () =>
      fetchJobs({
        status: failed24h ? "FAILED" : status || undefined,
        q: q || undefined,
        sort,
        cursor,
        limit: 50,
        include_archived: includeArchived || undefined,
        failed_within_hours: failed24h ? 24 : undefined,
        started_after: startedAfter ? new Date(startedAfter).toISOString() : undefined,
        started_before: startedBefore ? new Date(startedBefore).toISOString() : undefined,
      }),
    refetchInterval: connected ? false : 5000,
  });

  useEffect(() => {
    setCursor(undefined);
    setRows([]);
  }, [status, q, sort, failed24h, startedAfter, startedBefore, includeArchived]);

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

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const resetFilters = (nextStatus: string, nextQ: string) => {
    setFailed24h(false);
    setStatus(nextStatus);
    setQ(nextQ);
  };

  if (isLoading && rows.length === 0) {
    return (
      <div className="page-loading">
        <div className="spinner" aria-hidden />
        <p>Loading jobs…</p>
      </div>
    );
  }
  if (error) {
    return <p className="error-banner">Could not load jobs. Is the API running on port 8080?</p>;
  }

  return (
    <main className="jobs-page">
      <header className="page-title-row">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">Ray cluster workloads · cursor-paginated from the API</p>
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
            value={q}
            onChange={(e) => resetFilters(status, e.target.value)}
            className="toolbar-search"
            aria-label="Search jobs"
          />
          <Field label="Sort by" className="toolbar-field">
            <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="job_id">Job ID</option>
              <option value="started_at">Started</option>
              <option value="status">Status</option>
            </Select>
          </Field>
          <Field label="Started after" className="toolbar-field">
            <Input
              type="datetime-local"
              value={startedAfter}
              onChange={(e) => setStartedAfter(e.target.value)}
            />
          </Field>
          <Field label="Started before" className="toolbar-field">
            <Input
              type="datetime-local"
              value={startedBefore}
              onChange={(e) => setStartedBefore(e.target.value)}
            />
          </Field>
        </div>
        <div className="toolbar-row toolbar-row-secondary">
          <div className="segmented" role="group" aria-label="Status filter">
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip || "all"}
                type="button"
                className={`segment ${!failed24h && status === chip ? "segment-active" : ""}`}
                onClick={() => resetFilters(chip, q)}
              >
                {chip || "All"}
              </button>
            ))}
            <button
              type="button"
              className={`segment ${failed24h ? "segment-active" : ""}`}
              onClick={() => {
                setFailed24h(true);
                setStatus("FAILED");
              }}
            >
              Failed (24h)
            </button>
          </div>
          <Checkbox
            label="Include archived"
            checked={includeArchived}
            onChange={(checked) => {
              setIncludeArchived(checked);
              setCursor(undefined);
              setRows([]);
            }}
          />
        </div>
      </section>

      <section className="table-card">
        <VirtualizedJobsTable rows={rows} />
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
