import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { fetchJob } from "@/shared/api/client";

export function JobDetailPage() {
  const { jobId = "" } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <p className="muted">Loading job…</p>;
  }
  if (error || !data) {
    return <p className="error">Job not found or API unavailable.</p>;
  }

  const job = data.job;

  return (
    <main className="job-detail">
      <p>
        <Link to="/">← Jobs</Link>
      </p>
      <h1>{job.job_id}</h1>
      <p className="mono">{job.entrypoint}</p>
      <dl className="meta-grid">
        <dt>Status</dt>
        <dd>{job.status}</dd>
        <dt>Tasks</dt>
        <dd>
          {job.task_running} running · {job.task_failed} failed · {job.task_total} total
        </dd>
        {Object.entries(job.metadata).map(([key, value]) => (
          <Fragment key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
      </dl>
    </main>
  );
}
