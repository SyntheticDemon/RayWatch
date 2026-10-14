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
  started_at: string | null;
  ended_at: string | null;
  task_running: number;
  task_failed: number;
  task_total: number;
  error_message: string | null;
  archived?: boolean;
};

export type JobDetail = JobSummary & {
  driver_pid: number | null;
  metadata: Record<string, string>;
};

export type TaskSummary = {
  task_id: string;
  job_id: string;
  name: string;
  status: string;
  func_or_class: string;
  worker_id: string | null;
  actor_id: string | null;
  parent_task_id: string | null;
  attempt_count: number;
  error_message: string | null;
  started_at: string | null;
  ended_at: string | null;
};

export type JobsPage = {
  items: JobSummary[];
  next_cursor: string | null;
  sync: SyncMeta;
};

export type TasksPage = {
  items: TaskSummary[];
  next_cursor: string | null;
  sync: SyncMeta;
};

export type JobResponse = {
  job: JobDetail;
  sync: SyncMeta;
};

export type TaskResponse = {
  task: TaskSummary;
  sync: SyncMeta;
};

export type JobLogsResponse = {
  job_id: string;
  logs: string;
  error_message: string | null;
  content_offset: number;
  content_length: number;
  sync: SyncMeta;
};

export type JobLogsQuery = {
  tail_lines?: number;
  after_offset?: number;
};

export type StopJobResponse = {
  job_id: string;
  accepted: boolean;
  message: string;
  sync: SyncMeta;
};

export type SearchHit = {
  kind: string;
  id: string;
  job_id: string | null;
  label: string;
  status: string | null;
};

export type SearchResponse = {
  items: SearchHit[];
  sync: SyncMeta;
};

export type NodeSummary = {
  node_id: string;
  hostname: string | null;
  state: string | null;
  is_head: boolean;
};

export type ActorSummary = {
  actor_id: string;
  class_name: string | null;
  state: string | null;
  job_id: string | null;
  worker_id: string | null;
  node_id: string | null;
};

export type NodesPage = {
  items: NodeSummary[];
  sync: SyncMeta;
};

export type ActorsPage = {
  items: ActorSummary[];
  sync: SyncMeta;
};

export type JobsQuery = {
  cursor?: string;
  limit?: number;
  status?: string;
  q?: string;
  sort?: "job_id" | "started_at" | "status";
  failed_within_hours?: number;
  started_after?: string;
  started_before?: string;
  include_archived?: boolean;
};

export type SyncTriggerResponse = {
  accepted: boolean;
  message: string;
  sync: SyncMeta;
  job_count: number;
  task_count: number;
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export function fetchJobs(query: JobsQuery = {}): Promise<JobsPage> {
  return fetchJson<JobsPage>(`/jobs${qs(query)}`);
}

export function fetchJob(jobId: string): Promise<JobResponse> {
  return fetchJson<JobResponse>(`/jobs/${jobId}`);
}

export function fetchJobTasks(jobId: string, cursor?: string): Promise<TasksPage> {
  return fetchJson<TasksPage>(`/jobs/${jobId}/tasks${qs({ cursor, limit: 100 })}`);
}

export function fetchTask(taskId: string): Promise<TaskResponse> {
  return fetchJson<TaskResponse>(`/tasks/${taskId}`);
}

export function fetchJobLogs(jobId: string, query: JobLogsQuery = {}): Promise<JobLogsResponse> {
  return fetchJson<JobLogsResponse>(`/jobs/${jobId}/logs${qs(query)}`);
}

export function stopJob(jobId: string): Promise<StopJobResponse> {
  return fetchJson<StopJobResponse>(`/jobs/${jobId}/stop`, { method: "POST" });
}

export function triggerSync(): Promise<SyncTriggerResponse> {
  return fetchJson<SyncTriggerResponse>("/sync/trigger", { method: "POST" });
}

export function searchEntities(q: string, limit = 20): Promise<SearchResponse> {
  return fetchJson<SearchResponse>(`/search${qs({ q, limit })}`);
}

export function fetchClusterNodes(): Promise<NodesPage> {
  return fetchJson<NodesPage>("/cluster/nodes");
}

export function fetchClusterActors(limit = 200): Promise<ActorsPage> {
  return fetchJson<ActorsPage>(`/cluster/actors${qs({ limit })}`);
}
