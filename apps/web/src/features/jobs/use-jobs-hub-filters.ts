import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

export type JobKind = "all" | "submission" | "internal";
export type TimePreset = "all" | "1h" | "24h" | "7d" | "custom";

export type ColumnFilters = {
  jobId: string;
  status: string;
  entrypoint: string;
};

const DEFAULT_COLUMNS: ColumnFilters = { jobId: "", status: "", entrypoint: "" };

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
      status: params.get("col_status") ?? "",
      entrypoint: params.get("col_entry") ?? "",
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
      col_status: cols.status || null,
      col_entry: cols.entrypoint || null,
    });

  function applyColumnFilters<T extends { job_id: string; status: string; entrypoint: string }>(
    items: T[],
  ): T[] {
    const j = columnFilters.jobId.trim().toLowerCase();
    const s = columnFilters.status.trim().toLowerCase();
    const e = columnFilters.entrypoint.trim().toLowerCase();
    return items.filter((job) => {
      if (j && !job.job_id.toLowerCase().includes(j)) return false;
      if (s && !job.status.toLowerCase().includes(s)) return false;
      if (e && !job.entrypoint.toLowerCase().includes(e)) return false;
      return true;
    });
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
