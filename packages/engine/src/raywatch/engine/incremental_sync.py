"""Augment Ray ingest batches with remove ops so live_cache tracks Ray truth incrementally."""

from __future__ import annotations

from raywatch.engine.job_snapshot_store import JobSnapshotStore
from raywatch.engine.live_cache import LiveCache
from raywatch.model.ingest import IngestBatch, IngestOp


def incoming_job_ids(batch: IngestBatch) -> set[str]:
    return {op.job.job_id for op in batch.ops if op.kind == "upsert_job" and op.job is not None}


def incoming_task_ids(batch: IngestBatch) -> set[str]:
    return {op.task.task_id for op in batch.ops if op.kind == "upsert_task" and op.task is not None}


def augment_jobs_batch(
    live_cache: LiveCache,
    batch: IngestBatch,
    *,
    snapshot_store: JobSnapshotStore | None = None,
    evict_missing_from_ray: bool,
) -> IngestBatch:
    if not evict_missing_from_ray:
        return batch
    incoming = incoming_job_ids(batch)
    ops = list(batch.ops)
    to_archive: list = []
    for job in live_cache.iter_jobs():
        if job.job_id in incoming:
            continue
        to_archive.append(job)
        ops.append(IngestOp(kind="remove_job", job_id=job.job_id))
    if snapshot_store is not None and to_archive:
        snapshot_store.upsert_jobs(to_archive)
    return IngestBatch(ops=ops, cluster_epoch=batch.cluster_epoch)


def augment_tasks_batch(live_cache: LiveCache, batch: IngestBatch) -> IngestBatch:
    incoming = incoming_task_ids(batch)
    ops = list(batch.ops)
    for task_id in list(live_cache._state.tasks.keys()):
        if task_id not in incoming:
            ops.append(IngestOp(kind="remove_task", task_id=task_id))
    return IngestBatch(ops=ops, cluster_epoch=batch.cluster_epoch)
