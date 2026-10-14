"""Post-sync hooks: durable snapshot + live WebSocket fan-out."""

from __future__ import annotations

from raywatch.engine.job_snapshot_store import snapshot_store_from_env
from raywatch.engine.live_cache import LiveCache
from raywatch.engine.live_hub import live_hub

_store = snapshot_store_from_env()


def job_snapshot_store():
    return _store


def after_live_sync(live_cache: LiveCache) -> None:
    jobs = list(live_cache.iter_jobs())
    _store.upsert_jobs(jobs)
    sync = live_cache.sync_meta()
    live_hub.publish(
        "*",
        {
            "type": "sync",
            "sync": sync.model_dump(mode="json"),
            "job_count": live_cache.job_count(),
            "task_count": live_cache.task_count(),
        },
    )


def resolve_job(live_cache: LiveCache, job_id: str):
    from raywatch.model.ingest import IngestBatch, IngestOp

    job = live_cache.get_job(job_id)
    if job is not None:
        return job
    archived = _store.get_job(job_id)
    if archived is None:
        return None
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[IngestOp(kind="upsert_job", job=archived)],
            cluster_epoch=live_cache.sync_meta().cluster_epoch,
        )
    )
    return archived
