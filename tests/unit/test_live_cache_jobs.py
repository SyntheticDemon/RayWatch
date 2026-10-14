"""LiveCache job index correctness."""

import bisect

from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus


def _upsert(job_id: str) -> None:
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


def test_job_ids_sorted_matches_jobs_dict() -> None:
    for jid in ("job-b", "job-a", "job-c"):
        _upsert(jid)
    assert live_cache._state.job_ids_sorted == sorted(live_cache._state.jobs.keys())


def test_list_jobs_pagination_and_cursor() -> None:
    for index in range(5):
        _upsert(f"job-{index:02d}")
    page1, cursor = live_cache.list_jobs(cursor=None, limit=2)
    assert [j.job_id for j in page1] == ["job-00", "job-01"]
    assert cursor == "job-01"
    page2, cursor2 = live_cache.list_jobs(cursor=cursor, limit=2)
    assert [j.job_id for j in page2] == ["job-02", "job-03"]
    assert cursor2 == "job-03"
    page3, cursor3 = live_cache.list_jobs(cursor=cursor2, limit=2)
    assert [j.job_id for j in page3] == ["job-04"]
    assert cursor3 is None


def test_remove_job_updates_sorted_index() -> None:
    _upsert("job-a")
    _upsert("job-b")
    live_cache.apply_ingest_batch(IngestBatch(ops=[IngestOp(kind="remove_job", job_id="job-a")]))
    assert live_cache._state.job_ids_sorted == ["job-b"]
    assert live_cache.job_count() == 1


def test_large_batch_rebuilds_index() -> None:
    ops = [
        IngestOp(
            kind="upsert_job",
            job=JobDetail(
                job_id=f"batch-{index:05d}",
                status=JobStatus.PENDING,
                entrypoint="e",
            ),
        )
        for index in range(100)
    ]
    live_cache.apply_ingest_batch(IngestBatch(ops=ops))
    expected = sorted(live_cache._state.jobs.keys())
    assert live_cache._state.job_ids_sorted == expected
    assert live_cache._state.job_ids_sorted == sorted(live_cache._state.job_ids_sorted)
    mid = expected[50]
    idx = bisect.bisect_left(live_cache._state.job_ids_sorted, mid)
    assert live_cache._state.job_ids_sorted[idx] == mid
