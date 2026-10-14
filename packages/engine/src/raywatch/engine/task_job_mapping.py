"""Map Ray internal job ids (hex) to RayWatch submission ids."""

from __future__ import annotations

from raywatch.engine.live_cache import LiveCache
from raywatch.model.ingest import IngestBatch, IngestOp


def ray_internal_to_submission_id(live_cache: LiveCache) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for job in live_cache._state.jobs.values():
        ray_id = job.metadata.get("ray_internal_job_id")
        if ray_id and str(ray_id) != job.job_id:
            mapping[str(ray_id)] = job.job_id
    return mapping


def rekey_tasks_to_submission_ids(live_cache: LiveCache, *, cluster_epoch: str) -> None:
    """Move tasks indexed under Ray internal job id into submission id buckets."""
    mapping = ray_internal_to_submission_id(live_cache)
    if not mapping:
        return
    ops: list[IngestOp] = []
    for task in list(live_cache._state.tasks.values()):
        submission_id = mapping.get(task.job_id)
        if submission_id is None or submission_id == task.job_id:
            continue
        ops.append(
            IngestOp(
                kind="upsert_task",
                task=task.model_copy(update={"job_id": submission_id}),
            )
        )
    if ops:
        live_cache.apply_ingest_batch(IngestBatch(ops=ops, cluster_epoch=cluster_epoch))
