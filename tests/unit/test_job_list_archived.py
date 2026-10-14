from raywatch.engine.job_list import list_jobs
from raywatch.engine.job_snapshot_store import JobSnapshotStore
from raywatch.engine.live_cache import LiveCache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus


def test_include_archived_merges_snapshot_only_jobs(tmp_path) -> None:
    cache = LiveCache()
    store = JobSnapshotStore(None, tmp_path)
    store.upsert_jobs(
        [
            JobDetail(
                job_id="archived-only",
                status=JobStatus.SUCCEEDED,
                entrypoint="old run",
            )
        ]
    )
    cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id="live-1", status=JobStatus.RUNNING, entrypoint="now"),
                )
            ]
        )
    )
    items, _ = list_jobs(
        cache,
        store,
        cursor=None,
        limit=50,
        include_archived=True,
    )
    ids = {j.job_id for j in items}
    assert ids == {"archived-only", "live-1"}
    archived = next(j for j in items if j.job_id == "archived-only")
    assert archived.archived is True
