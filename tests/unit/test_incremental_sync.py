from raywatch.engine.incremental_sync import augment_jobs_batch, augment_tasks_batch
from raywatch.engine.job_snapshot_store import JobSnapshotStore
from raywatch.engine.live_cache import LiveCache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus
from raywatch.model.task import TaskStatus, TaskSummary


def test_augment_tasks_removes_stale_tasks() -> None:
    cache = LiveCache()
    cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_task",
                    task=TaskSummary(
                        task_id="t-old",
                        job_id="j1",
                        name="old",
                        status=TaskStatus.FINISHED,
                    ),
                )
            ]
        )
    )
    incoming = IngestBatch(
        ops=[
            IngestOp(
                kind="upsert_task",
                task=TaskSummary(
                    task_id="t-new",
                    job_id="j1",
                    name="new",
                    status=TaskStatus.RUNNING,
                ),
            )
        ]
    )
    merged = augment_tasks_batch(cache, incoming)
    kinds = [op.kind for op in merged.ops]
    assert "remove_task" in kinds
    cache.apply_ingest_batch(merged)
    assert cache.task_count() == 1
    assert cache.get_task("t-new") is not None


def test_augment_jobs_archives_evicted(tmp_path) -> None:
    cache = LiveCache()
    store = JobSnapshotStore(None, tmp_path)
    cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id="gone", status=JobStatus.SUCCEEDED, entrypoint="x"),
                )
            ]
        )
    )
    incoming = IngestBatch(
        ops=[
            IngestOp(
                kind="upsert_job",
                job=JobDetail(job_id="stay", status=JobStatus.RUNNING, entrypoint="y"),
            )
        ]
    )
    merged = augment_jobs_batch(cache, incoming, snapshot_store=store, evict_missing_from_ray=True)
    cache.apply_ingest_batch(merged)
    assert cache.get_job("gone") is None
    assert store.get_job("gone") is not None
    assert cache.get_job("stay") is not None


def test_augment_tasks_skips_evict_when_ray_page_incomplete() -> None:
    cache = LiveCache()
    cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_task",
                    task=TaskSummary(
                        task_id="t-stale",
                        job_id="j1",
                        name="stale",
                        status=TaskStatus.FINISHED,
                    ),
                )
            ]
        )
    )
    incoming = IngestBatch(
        ops=[
            IngestOp(
                kind="upsert_task",
                task=TaskSummary(
                    task_id="t-new",
                    job_id="j1",
                    name="new",
                    status=TaskStatus.RUNNING,
                ),
            )
        ]
    )
    merged = augment_tasks_batch(cache, incoming, ray_task_total=99)
    assert all(op.kind != "remove_task" for op in merged.ops)
