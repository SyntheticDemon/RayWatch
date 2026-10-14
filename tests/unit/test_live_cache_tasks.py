"""LiveCache task indexes and pagination."""

from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus
from raywatch.model.task import TaskStatus, TaskSummary


def _job(job_id: str = "job-1") -> None:
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id=job_id, status=JobStatus.RUNNING, entrypoint="x"),
                )
            ]
        )
    )


def test_upsert_and_list_tasks_for_job() -> None:
    _job()
    for index in range(3):
        live_cache.apply_ingest_batch(
            IngestBatch(
                ops=[
                    IngestOp(
                        kind="upsert_task",
                        task=TaskSummary(
                            task_id=f"t-{index}",
                            job_id="job-1",
                            status=TaskStatus.RUNNING,
                            name=f"task-{index}",
                        ),
                    )
                ]
            )
        )
    items, cursor = live_cache.list_tasks_for_job("job-1", cursor=None, limit=2)
    assert [t.task_id for t in items] == ["t-0", "t-1"]
    assert cursor == "t-1"
    items2, cursor2 = live_cache.list_tasks_for_job("job-1", cursor=cursor, limit=2)
    assert [t.task_id for t in items2] == ["t-2"]
    assert cursor2 is None


def test_remove_job_clears_tasks() -> None:
    _job()
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_task",
                    task=TaskSummary(
                        task_id="t-0",
                        job_id="job-1",
                        status=TaskStatus.FINISHED,
                    ),
                )
            ]
        )
    )
    live_cache.apply_ingest_batch(IngestBatch(ops=[IngestOp(kind="remove_job", job_id="job-1")]))
    assert live_cache.task_count() == 0
    assert live_cache.job_count() == 0


def test_remove_task() -> None:
    _job()
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_task",
                    task=TaskSummary(
                        task_id="t-0",
                        job_id="job-1",
                        status=TaskStatus.RUNNING,
                    ),
                ),
                IngestOp(kind="remove_task", task_id="t-0"),
            ]
        )
    )
    assert live_cache.task_count() == 0
