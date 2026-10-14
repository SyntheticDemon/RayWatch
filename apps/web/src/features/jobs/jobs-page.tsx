import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { fetchJobs } from "@/shared/api/client";

export function JobsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <p className="muted">Loading jobs…</p>;
  }
  if (error) {
    return <p className="error">Could not load jobs. Is the API running?</p>;
  }

  const sync = data?.sync;

  return (
    <main className="jobs-page">
      <header className="page-header">
        <h1>Jobs</h1>
        {sync && (
          <p className="sync-banner" data-out-of-sync={sync.ray_out_of_sync}>
            sync_delay {sync.sync_delay_ms ?? "—"} ms
            {sync.ray_out_of_sync ? " · ray_out_of_sync" : ""}
          </p>
        )}
      </header>
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
          {data?.items.map((job) => (
            <tr key={job.job_id}>
              <td>
                <Link to={`/jobs/${job.job_id}`}>{job.job_id}</Link>
              </td>
              <td>
                <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
              </td>
              <td className="mono">{job.entrypoint}</td>
              <td>
                {job.task_running} run / {job.task_failed} fail / {job.task_total} total
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
