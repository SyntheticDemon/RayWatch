import type { JobSummary } from "@/shared/api/client";

/** Apply WS jobs_preview: patch known rows; optionally prepend jobs not yet in the table. */
export function mergeJobRows(
  existing: JobSummary[],
  preview: JobSummary[],
  options?: { allowNewRows?: boolean },
): JobSummary[] {
  const allowNew = options?.allowNewRows ?? true;
  const byId = new Map(preview.map((job) => [job.job_id, job]));
  const merged = existing.map((job) => byId.get(job.job_id) ?? job);
  if (!allowNew) return merged;
  const extras: JobSummary[] = [];
  for (const job of preview) {
    if (!merged.some((row) => row.job_id === job.job_id)) {
      extras.push(job);
    }
  }
  return extras.length ? [...extras, ...merged] : merged;
}
