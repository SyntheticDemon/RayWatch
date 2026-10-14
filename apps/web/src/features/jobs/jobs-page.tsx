import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { VirtualizedJobsTable } from "@/features/jobs/virtualized-jobs-table";
import { fetchJobs, triggerSync, type JobSummary } from "@/shared/api/client";
import { useLiveSync } from "@/shared/hooks/use-live-sync";
import { SyncBanner } from "@/shared/ui/sync-banner";

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
  const queryClient = useQueryClient();
  const { connected } = useLiveSync();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["jobs", status, q, sort, failed24h, startedAfter, startedBefore, cursor ?? ""],
    queryFn: () =>
      fetchJobs({
        status: failed24h ? "FAILED" : status || undefined,
        q: q || undefined,
        sort,
        cursor,
        limit: 50,
        failed_within_hours: failed24h ? 24 : undefined,
        started_after: startedAfter ? new Date(startedAfter).toISOString() : undefined,
        started_before: startedBefore ? new Date(startedBefore).toISOString() : undefined,
      }),
    refetchInterval: connected ? false : 5000,
  });

  useEffect(() => {
    setCursor(undefined);
    setRows([]);
  }, [status, q, sort, failed24h, startedAfter, startedBefore]);

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
    return <p className="muted">Loading jobs…</p>;
  }
  if (error) {
    return <p className="error">Could not load jobs. Is the API running?</p>;
  }

  return (
    <main className="jobs-page">
      <header className="page-header">
        <h1>Jobs</h1>
        <div className="header-actions">
          <span className="ws-indicator" data-connected={connected}>
            {connected ? "Live" : "Polling"}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            Sync Ray
          </button>
        </div>
      </header>
      <SyncBanner sync={data?.sync} />
      <div className="jobs-toolbar">
        <input
          className="search-input"
          placeholder="Search job id or entrypoint"
          value={q}
          onChange={(e) => resetFilters(status, e.target.value)}
        />
        <label className="sort-label">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="job_id">Job ID</option>
            <option value="started_at">Started</option>
            <option value="status">Status</option>
          </select>
        </label>
        <label className="sort-label">
          From
          <input
            type="datetime-local"
            value={startedAfter}
            onChange={(e) => setStartedAfter(e.target.value)}
          />
        </label>
        <label className="sort-label">
          To
          <input
            type="datetime-local"
            value={startedBefore}
            onChange={(e) => setStartedBefore(e.target.value)}
          />
        </label>
        <div className="chip-row">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip || "all"}
              type="button"
              className={`chip ${!failed24h && status === chip ? "chip-active" : ""}`}
              onClick={() => resetFilters(chip, q)}
            >
              {chip || "All"}
            </button>
          ))}
          <button
            type="button"
            className={`chip ${failed24h ? "chip-active" : ""}`}
            onClick={() => {
              setFailed24h(true);
              setStatus("FAILED");
            }}
          >
            Failed (24h)
          </button>
        </div>
      </div>
      <VirtualizedJobsTable rows={rows} />
      {data?.next_cursor && (
        <button
          type="button"
          className="btn-secondary"
          disabled={isFetching}
          onClick={() => setCursor(data.next_cursor!)}
        >
          Load more
        </button>
      )}
    </main>
  );
}
