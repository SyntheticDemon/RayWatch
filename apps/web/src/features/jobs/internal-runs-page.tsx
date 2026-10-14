import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { TaskTree } from "@/features/jobs/task-tree";
import { fetchJob, fetchJobTasks, fetchJobs } from "@/shared/api/client";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";

/**
 * Surfaces Ray driver / internal jobs and nested task trees (operator “nested runs” view).
 */
export function InternalRunsPage() {
  const jobsQuery = useQuery({
    queryKey: ["jobs", "internal-runs-list"],
    queryFn: () => fetchJobs({ limit: 100, sort: "started_at", job_kind: "internal" }),
  });

  const internalJobs = jobsQuery.data?.items ?? [];

  const sampleJob = internalJobs[0];
  const tasksQuery = useQuery({
    queryKey: ["job-tasks", sampleJob?.job_id],
    queryFn: () => fetchJobTasks(sampleJob!.job_id),
    enabled: Boolean(sampleJob?.job_id),
  });

  const detailQuery = useQuery({
    queryKey: ["job", sampleJob?.job_id],
    queryFn: () => fetchJob(sampleJob!.job_id),
    enabled: Boolean(sampleJob?.job_id),
  });

  return (
    <main className="internal-runs-page">
      <Breadcrumbs items={[{ label: "Jobs", to: "/" }, { label: "Internal runs", current: true }]} />
      <header className="page-title-row">
        <div>
          <h1 className="page-title">Internal runs</h1>
          <p className="page-subtitle">
            Driver and system jobs (non–<code>raysubmit_</code> ids) with nested task trees
          </p>
        </div>
      </header>

      <section className="table-card">
        <h2>Internal jobs</h2>
        {jobsQuery.isLoading ? (
          <p className="muted">Loading…</p>
        ) : internalJobs.length === 0 ? (
          <p className="muted">No internal jobs in the current index. Toggle “Internal” on the Jobs hub or sync live Ray.</p>
        ) : (
          <table className="simple-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Status</th>
                <th>Entrypoint</th>
              </tr>
            </thead>
            <tbody>
              {internalJobs.map((job) => (
                <tr key={job.job_id}>
                  <td className="mono">
                    <Link to={`/jobs/${job.job_id}`} className="text-link">{job.job_id}</Link>
                  </td>
                  <td>{job.status}</td>
                  <td>{job.entrypoint || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {sampleJob && tasksQuery.data && (
        <section className="panel">
          <h2>Nested runs · {sampleJob.job_id}</h2>
          {detailQuery.data?.job.metadata?.ray_internal_job_id && (
            <p className="muted small">
              Ray internal job id:{" "}
              <span className="mono">{detailQuery.data.job.metadata.ray_internal_job_id}</span>
            </p>
          )}
          <TaskTree
            tasks={tasksQuery.data.items}
            selectedTaskId={null}
            onSelect={(id) => {
              window.location.href = `/jobs/${sampleJob.job_id}?task=${id}`;
            }}
          />
        </section>
      )}
    </main>
  );
}
