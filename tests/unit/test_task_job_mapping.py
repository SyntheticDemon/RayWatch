from raywatch.engine.live_cache import LiveCache
from raywatch.engine.task_job_mapping import rekey_tasks_to_submission_ids
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus
from raywatch.model.task import TaskStatus, TaskSummary


def test_rekey_tasks_moves_internal_job_bucket_to_submission() -> None:
    cache = LiveCache()
    cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(
                        job_id="raysubmit_abc",
                        status=JobStatus.SUCCEEDED,
                        entrypoint="python x.py",
                        metadata={"ray_internal_job_id": "0a000000"},
                    ),
                ),
                IngestOp(
                    kind="upsert_task",
                    task=TaskSummary(
                        task_id="t1",
                        job_id="0a000000",
                        name="fn",
                        status=TaskStatus.FINISHED,
                    ),
                ),
            ]
        )
    )
    rekey_tasks_to_submission_ids(cache, cluster_epoch="live")
    task = cache.get_task("t1")
    assert task is not None
    assert task.job_id == "raysubmit_abc"
    items, _ = cache.list_tasks_for_job("raysubmit_abc", None, 50)
    assert len(items) == 1
