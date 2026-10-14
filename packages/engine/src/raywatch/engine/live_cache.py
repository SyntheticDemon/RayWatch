from __future__ import annotations

import bisect
from dataclasses import dataclass, field
from datetime import UTC, datetime

from raywatch.model.freshness import SyncMeta
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus, JobSummary
from raywatch.model.task import TaskSummary


def _utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass
class LiveCacheState:
    jobs: dict[str, JobDetail] = field(default_factory=dict)
    job_ids_sorted: list[str] = field(default_factory=list)
    tasks: dict[str, TaskSummary] = field(default_factory=dict)
    tasks_by_job: dict[str, list[str]] = field(default_factory=dict)
    last_sync_at: datetime | None = None
    ray_out_of_sync: bool = False
    cluster_epoch: str = "default"
    ray_reachable: bool = True


class LiveCache:
    def __init__(self) -> None:
        self._state = LiveCacheState()

    def reset(self) -> None:
        """Drop all in-memory indexes (tests and perf must call this between scenarios)."""
        self._state = LiveCacheState()

    def apply_ingest_batch(self, batch: IngestBatch) -> None:
        job_touched = False
        for op in batch.ops:
            if self._apply_op(op):
                job_touched = True
        if job_touched and len(batch.ops) > 64:
            self._rebuild_job_index()
        self._state.cluster_epoch = batch.cluster_epoch
        self._state.last_sync_at = _utc_now()
        self._state.ray_out_of_sync = False
        self._state.ray_reachable = True

    def mark_ray_unreachable(self) -> None:
        self._state.ray_out_of_sync = True
        self._state.ray_reachable = False

    def _rebuild_job_index(self) -> None:
        self._state.job_ids_sorted = sorted(self._state.jobs.keys())

    def _track_job_id(self, job_id: str) -> None:
        if job_id not in self._state.jobs:
            return
        if job_id in self._state.job_ids_sorted:
            return
        bisect.insort(self._state.job_ids_sorted, job_id)

    def _untrack_job_id(self, job_id: str) -> None:
        idx = bisect.bisect_left(self._state.job_ids_sorted, job_id)
        if idx < len(self._state.job_ids_sorted) and self._state.job_ids_sorted[idx] == job_id:
            self._state.job_ids_sorted.pop(idx)

    def _apply_op(self, op: IngestOp) -> bool:
        if op.kind == "upsert_job" and op.job is not None:
            job_id = op.job.job_id
            existing = self._state.jobs.get(job_id)
            if isinstance(op.job, JobDetail):
                self._state.jobs[job_id] = op.job
            elif existing is not None:
                self._state.jobs[job_id] = existing.model_copy(update=op.job.model_dump())
            else:
                self._state.jobs[job_id] = JobDetail(**op.job.model_dump())
            self._track_job_id(job_id)
            return True
        if op.kind == "remove_job" and op.job_id:
            self._state.jobs.pop(op.job_id, None)
            self._untrack_job_id(op.job_id)
            for task_id in self._state.tasks_by_job.pop(op.job_id, []):
                self._state.tasks.pop(task_id, None)
            return True
        if op.kind == "upsert_task" and op.task is not None:
            self._state.tasks[op.task.task_id] = op.task
            bucket = self._state.tasks_by_job.setdefault(op.task.job_id, [])
            if op.task.task_id not in bucket:
                bucket.append(op.task.task_id)
            return False
        if op.kind == "remove_task" and op.task_id:
            task = self._state.tasks.pop(op.task_id, None)
            if task is not None:
                bucket = self._state.tasks_by_job.get(task.job_id, [])
                if op.task_id in bucket:
                    bucket.remove(op.task_id)
            return False
        return False

    def sync_meta(self) -> SyncMeta:
        delay_ms: int | None = None
        if self._state.last_sync_at is not None:
            delta = _utc_now() - self._state.last_sync_at
            delay_ms = int(delta.total_seconds() * 1000)
        return SyncMeta(
            source="live_cache",
            last_sync_at=self._state.last_sync_at,
            sync_delay_ms=delay_ms,
            ray_out_of_sync=self._state.ray_out_of_sync,
            cluster_epoch=self._state.cluster_epoch,
        )

    def clear_tasks(self) -> None:
        self._state.tasks.clear()
        self._state.tasks_by_job.clear()

    def get_task(self, task_id: str) -> TaskSummary | None:
        return self._state.tasks.get(task_id)

    def iter_jobs(self) -> list[JobDetail]:
        return list(self._state.jobs.values())

    def search_entities(self, query: str, limit: int = 20) -> list[dict[str, str | None]]:
        needle = query.lower().strip()
        if not needle:
            return []
        limit = min(max(limit, 1), 50)
        hits: list[dict[str, str | None]] = []
        for jid in self._state.job_ids_sorted:
            if len(hits) >= limit:
                break
            job = self._state.jobs[jid]
            if needle in jid.lower() or needle in job.entrypoint.lower():
                hits.append(
                    {
                        "kind": "job",
                        "id": jid,
                        "job_id": jid,
                        "label": job.entrypoint or jid,
                        "status": job.status.value,
                    }
                )
        for task_id, task in self._state.tasks.items():
            if len(hits) >= limit:
                break
            if needle in task_id.lower() or needle in task.name.lower():
                hits.append(
                    {
                        "kind": "task",
                        "id": task_id,
                        "job_id": task.job_id,
                        "label": task.name or task.func_or_class or task_id,
                        "status": task.status.value,
                    }
                )
        return hits[:limit]

    def list_jobs(
        self,
        cursor: str | None,
        limit: int,
        *,
        status: JobStatus | None = None,
        q: str | None = None,
        sort: str = "job_id",
        started_after: datetime | None = None,
        started_before: datetime | None = None,
        failed_within_hours: float | None = None,
    ) -> tuple[list[JobSummary], str | None]:
        limit = min(max(limit, 1), 100)
        job_ids = list(self._state.job_ids_sorted)
        if status is not None:
            job_ids = [jid for jid in job_ids if self._state.jobs[jid].status == status]
        if started_after is not None:
            job_ids = [
                jid
                for jid in job_ids
                if self._state.jobs[jid].started_at is not None
                and self._state.jobs[jid].started_at >= started_after
            ]
        if started_before is not None:
            job_ids = [
                jid
                for jid in job_ids
                if self._state.jobs[jid].started_at is not None
                and self._state.jobs[jid].started_at <= started_before
            ]
        if failed_within_hours is not None:
            cutoff = _utc_now().timestamp() - failed_within_hours * 3600
            job_ids = [
                jid
                for jid in job_ids
                if self._state.jobs[jid].status == JobStatus.FAILED
                and self._state.jobs[jid].ended_at is not None
                and self._state.jobs[jid].ended_at.timestamp() >= cutoff
            ]
        if q:
            needle = q.lower().strip()
            if needle:
                job_ids = [
                    jid
                    for jid in job_ids
                    if needle in jid.lower()
                    or needle in self._state.jobs[jid].entrypoint.lower()
                    or (
                        self._state.jobs[jid].error_message
                        and needle in self._state.jobs[jid].error_message.lower()
                    )
                ]
        if sort == "started_at":
            job_ids.sort(
                key=lambda jid: self._state.jobs[jid].started_at or _utc_now(),
                reverse=True,
            )
        elif sort == "status":
            job_ids.sort(key=lambda jid: self._state.jobs[jid].status.value)
        else:
            job_ids.sort()
        start = 0
        if cursor:
            idx = bisect.bisect_left(job_ids, cursor)
            if idx < len(job_ids) and job_ids[idx] == cursor:
                start = idx + 1
            elif idx < len(job_ids):
                start = idx
        slice_ids = job_ids[start : start + limit]
        items = [JobSummary(**self._state.jobs[jid].model_dump()) for jid in slice_ids]
        has_more = len(slice_ids) == limit and start + limit < len(job_ids)
        next_cursor = slice_ids[-1] if has_more else None
        return items, next_cursor

    def get_job(self, job_id: str) -> JobDetail | None:
        return self._state.jobs.get(job_id)

    def list_tasks_for_job(
        self, job_id: str, cursor: str | None, limit: int
    ) -> tuple[list[TaskSummary], str | None]:
        limit = min(max(limit, 1), 500)
        task_ids = self._state.tasks_by_job.get(job_id, [])
        start = 0
        if cursor:
            try:
                start = task_ids.index(cursor) + 1
            except ValueError:
                start = 0
        slice_ids = task_ids[start : start + limit]
        items = [self._state.tasks[tid] for tid in slice_ids if tid in self._state.tasks]
        has_more = len(slice_ids) == limit and start + limit < len(task_ids)
        next_cursor = slice_ids[-1] if has_more else None
        return items, next_cursor

    def job_count(self) -> int:
        return len(self._state.jobs)

    def task_count(self) -> int:
        return len(self._state.tasks)
