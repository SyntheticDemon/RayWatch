const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type SyncMeta = {
  source: string;
  last_sync_at: string | null;
  sync_delay_ms: number | null;
  ray_out_of_sync: boolean;
  cluster_epoch: string;
};

export type JobSummary = {
  job_id: string;
  status: string;
  entrypoint: string;
  task_running: number;
  task_failed: number;
  task_total: number;
  error_message: string | null;
};

export type JobDetail = JobSummary & {
  driver_pid: number | null;
  metadata: Record<string, string>;
};

export type JobsPage = {
  items: JobSummary[];
  next_cursor: string | null;
  sync: SyncMeta;
};

export type JobResponse = {
  job: JobDetail;
  sync: SyncMeta;
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchJobs(): Promise<JobsPage> {
  return fetchJson<JobsPage>("/jobs");
}

export function fetchJob(jobId: string): Promise<JobResponse> {
  return fetchJson<JobResponse>(`/jobs/${jobId}`);
}
