import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

export type JobKind = "all" | "submission" | "internal";
export type TimePreset = "all" | "1h" | "24h" | "7d" | "custom";

export type ColumnFilters = {
  jobId: string;
  submissionId: string;
  status: string;
  jobType: string;
  entrypoint: string;
  message: string;
  driverPid: string;
};

export type JobColumnRow = {
  job_id: string;
  status: string;
  entrypoint: string;
  error_message?: string | null;
  submission_id?: string | null;
  job_type?: string | null;
  driver_pid?: number | null;
};

export function applyJobColumnFilters<T extends JobColumnRow>(
  items: T[],
  columnFilters: ColumnFilters,
): T[] {
  const jobId = columnFilters.jobId.trim().toLowerCase();
  const submissionId = columnFilters.submissionId.trim().toLowerCase();
  const status = columnFilters.status.trim().toLowerCase();
  const jobType = columnFilters.jobType.trim().toLowerCase();
  const entrypoint = columnFilters.entrypoint.trim().toLowerCase();
  const message = columnFilters.message.trim().toLowerCase();
  const driverPid = columnFilters.driverPid.trim().toLowerCase();
  return items.filter((job) => {
    if (jobId && !job.job_id.toLowerCase().includes(jobId)) return false;
    if (submissionId && !(job.submission_id ?? "").toLowerCase().includes(submissionId)) return false;
    if (status && !job.status.toLowerCase().includes(status)) return false;
    if (jobType && !(job.job_type ?? "").toLowerCase().includes(jobType)) return false;
    if (entrypoint && !job.entrypoint.toLowerCase().includes(entrypoint)) return false;
    if (message && !(job.error_message ?? "").toLowerCase().includes(message)) return false;
    if (driverPid && !String(job.driver_pid ?? "").toLowerCase().includes(driverPid)) return false;
    return true;
  });
}

const DEFAULT_COLUMNS: ColumnFilters = {
  jobId: "",
  submissionId: "",
  status: "",
  jobType: "",
  entrypoint: "",
  message: "",
  driverPid: "",
};

/** Compute API window at fetch time — not on every React render (avoids refetch loops). */
export function apiStartedAfter(timePreset: TimePreset, afterParam: string): string | undefined {
  if (timePreset === "all") return undefined;
  if (timePreset === "custom") return afterParam || undefined;
  const ms =
    timePreset === "1h"
      ? 60 * 60 * 1000
      : timePreset === "24h"
        ? 24 * 60 * 60 * 1000
        : timePreset === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : 0;
  if (!ms) return undefined;
  return new Date(Date.now() - ms).toISOString();
}

export function apiStartedBefore(timePreset: TimePreset, beforeParam: string): string | undefined {
  if (timePreset !== "custom") return undefined;
  return beforeParam || undefined;
}

export function isSubmissionJob(jobId: string): boolean {
  return jobId.startsWith("raysubmit_") || /^[0-9a-f]{8}$/i.test(jobId);
}

export function useJobsHubFilters() {
  const [params, setParams] = useSearchParams();

  const qInput = params.get("q") ?? "";
  const debouncedQ = useDebouncedValue(qInput, 350);

  const status = params.get("status") ?? "";
  const sort = (params.get("sort") as "job_id" | "started_at" | "status") || "job_id";
  const failed24h = params.get("failed24h") === "1";
  const includeArchived = params.get("archived") === "1";
  const jobKind = (params.get("kind") as JobKind) || "all";
  const timePreset = (params.get("period") as TimePreset) || "all";

  const startedAfter = params.get("after") ?? "";
  const startedBefore = params.get("before") ?? "";

  const columnFilters: ColumnFilters = useMemo(
    () => ({
      jobId: params.get("col_job") ?? "",
      submissionId: params.get("col_sub") ?? "",
      status: params.get("col_status") ?? "",
      jobType: params.get("col_type") ?? "",
      entrypoint: params.get("col_entry") ?? "",
      message: params.get("col_msg") ?? "",
      driverPid: params.get("col_pid") ?? "",
    }),
    [params],
  );

  const patch = useCallback(
    (updates: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === "") next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setQ = (value: string) => patch({ q: value || null });
  const setStatus = (value: string) => patch({ status: value || null, failed24h: null });
  const setSort = (value: string) => patch({ sort: value });
  const setFailed24h = () => patch({ failed24h: "1", status: "FAILED" });
  const setIncludeArchived = (on: boolean) => patch({ archived: on ? "1" : null });
  const setJobKind = (kind: JobKind) => patch({ kind: kind === "all" ? null : kind });
  const setTimePreset = (preset: TimePreset) => {
    if (preset === "custom") patch({ period: "custom" });
    else if (preset === "all") patch({ period: null, after: null, before: null });
    else patch({ period: preset, after: null, before: null });
  };
  const setStartedAfter = (v: string) => patch({ period: "custom", after: v || null });
  const setStartedBefore = (v: string) => patch({ period: "custom", before: v || null });
  const setColumnFilters = (cols: ColumnFilters) =>
    patch({
      col_job: cols.jobId || null,
      col_sub: cols.submissionId || null,
      col_status: cols.status || null,
      col_type: cols.jobType || null,
      col_entry: cols.entrypoint || null,
      col_msg: cols.message || null,
      col_pid: cols.driverPid || null,
    });

  function applyColumnFilters<T extends JobColumnRow>(items: T[]): T[] {
    return applyJobColumnFilters(items, columnFilters);
  }

  return {
    qInput,
    debouncedQ,
    setQ,
    status,
    setStatus,
    sort,
    setSort,
    failed24h,
    setFailed24h,
    includeArchived,
    setIncludeArchived,
    jobKind,
    setJobKind,
    timePreset,
    setTimePreset,
    startedAfter,
    startedBefore,
    setStartedAfter,
    setStartedBefore,
    columnFilters,
    setColumnFilters,
    applyColumnFilters,
    isSubmissionJob,
  };
}

export { DEFAULT_COLUMNS };
