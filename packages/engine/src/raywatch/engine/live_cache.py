from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from raywatch.model.freshness import SyncMeta
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobSummary
from raywatch.model.task import TaskSummary


def _utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass
class LiveCacheState:
    jobs: dict[str, JobDetail] = field(default_factory=dict)
    tasks: dict[str, TaskSummary] = field(default_factory=dict)
    tasks_by_job: dict[str, list[str]] = field(default_factory=dict)
    last_sync_at: datetime | None = None
    ray_out_of_sync: bool = False
    cluster_epoch: str = "default"
    ray_reachable: bool = True


class LiveCache:
    def __init__(self) -> None:
        self._state = LiveCacheState()

    def apply_ingest_batch(self, batch: IngestBatch) -> None:
        for op in batch.ops:
            self._apply_op(op)
        self._state.cluster_epoch = batch.cluster_epoch
        self._state.last_sync_at = _utc_now()
        self._state.ray_out_of_sync = False
        self._state.ray_reachable = True

    def mark_ray_unreachable(self) -> None:
        self._state.ray_out_of_sync = True
        self._state.ray_reachable = False

    def _apply_op(self, op: IngestOp) -> None:
        if op.kind == "upsert_job" and op.job is not None:
            existing = self._state.jobs.get(op.job.job_id)
            if isinstance(op.job, JobDetail):
                self._state.jobs[op.job.job_id] = op.job
            elif existing is not None:
                self._state.jobs[op.job.job_id] = existing.model_copy(update=op.job.model_dump())
            else:
                self._state.jobs[op.job.job_id] = JobDetail(**op.job.model_dump())
        elif op.kind == "remove_job" and op.job_id:
            self._state.jobs.pop(op.job_id, None)
            for task_id in self._state.tasks_by_job.pop(op.job_id, []):
                self._state.tasks.pop(task_id, None)
        elif op.kind == "upsert_task" and op.task is not None:
            self._state.tasks[op.task.task_id] = op.task
            bucket = self._state.tasks_by_job.setdefault(op.task.job_id, [])
            if op.task.task_id not in bucket:
                bucket.append(op.task.task_id)
        elif op.kind == "remove_task" and op.task_id:
            task = self._state.tasks.pop(op.task_id, None)
            if task is not None:
                bucket = self._state.tasks_by_job.get(task.job_id, [])
                if op.task_id in bucket:
                    bucket.remove(op.task_id)

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

    def list_jobs(self, cursor: str | None, limit: int) -> tuple[list[JobSummary], str | None]:
        limit = min(max(limit, 1), 100)
        job_ids = sorted(self._state.jobs.keys())
        start = 0
        if cursor:
            try:
                start = job_ids.index(cursor) + 1
            except ValueError:
                start = 0
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
