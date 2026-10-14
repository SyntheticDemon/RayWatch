from raywatch.engine.live_cache import LiveCache
from raywatch.engine.live_hub import live_hub
from raywatch.engine.sync_side_effects import after_live_sync
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus


def test_after_live_sync_includes_jobs_preview() -> None:
    cache = LiveCache()
    cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id="job-a", status=JobStatus.RUNNING, entrypoint="a.py"),
                ),
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id="job-b", status=JobStatus.SUCCEEDED, entrypoint="b.py"),
                ),
            ]
        )
    )
    queue = live_hub.subscribe("*")
    after_live_sync(cache)
    message = queue.get_nowait()
    live_hub.unsubscribe("*", queue)
    assert message["type"] == "sync"
    assert len(message["jobs_preview"]) == 2
    ids = {row["job_id"] for row in message["jobs_preview"]}
    assert ids == {"job-a", "job-b"}
