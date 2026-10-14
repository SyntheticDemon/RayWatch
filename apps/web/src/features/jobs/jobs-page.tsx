import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchJobs, triggerSync, type JobSummary } from "@/shared/api/client";
import { SyncBanner } from "@/shared/ui/sync-banner";

const STATUS_CHIPS = ["", "RUNNING", "FAILED", "SUCCEEDED"] as const;

export function JobsPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<JobSummary[]>([]);
  const [sort, setSort] = useState<"job_id" | "started_at" | "status">("job_id");
  const queryClient = useQueryClient();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["jobs", status, q, sort, cursor ?? ""],
    queryFn: () =>
      fetchJobs({
        status: status || undefined,
        q: q || undefined,
        sort,
        cursor,
        limit: 50,
      }),
    refetchInterval: 5000,
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

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const resetFilters = (nextStatus: string, nextQ: string) => {
    setStatus(nextStatus);
    setQ(nextQ);
    setCursor(undefined);
    setRows([]);
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
        <button
          type="button"
          className="btn-secondary"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          Sync Ray
        </button>
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
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="job_id">Job ID</option>
            <option value="started_at">Started</option>
            <option value="status">Status</option>
          </select>
        </label>
        <div className="chip-row">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip || "all"}
              type="button"
              className={`chip ${status === chip ? "chip-active" : ""}`}
              onClick={() => resetFilters(chip, q)}
            >
              {chip || "All"}
            </button>
          ))}
        </div>
      </div>
      <table className="jobs-table">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Status</th>
            <th>Entrypoint</th>
            <th>Tasks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((job) => (
            <tr key={job.job_id}>
              <td>
                <Link to={`/jobs/${job.job_id}`}>{job.job_id}</Link>
              </td>
              <td>
                <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
              </td>
              <td className="mono truncate">{job.entrypoint}</td>
              <td>
                {job.task_running} run / {job.task_failed} fail / {job.task_total} total
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
