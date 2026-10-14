from raywatch.api.state import live_cache
from raywatch.engine.job_kind import is_submission_job_id, job_id_matches_kind
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus


def test_submission_id_heuristics() -> None:
    assert is_submission_job_id("raysubmit_abc")
    assert is_submission_job_id("01000000")
    assert not is_submission_job_id("driver-job-1")


def test_list_jobs_job_kind_internal() -> None:
    live_cache.reset()
    ops = [
        IngestOp(
            kind="upsert_job",
            job=JobDetail(job_id="raysubmit_x", status=JobStatus.RUNNING, entrypoint="a.py"),
        ),
        IngestOp(
            kind="upsert_job",
            job=JobDetail(job_id="driver-internal", status=JobStatus.RUNNING, entrypoint="b.py"),
        ),
    ]
    live_cache.apply_ingest_batch(IngestBatch(ops=ops))
    items, _ = live_cache.list_jobs(None, 50, job_kind="internal")
    assert [j.job_id for j in items] == ["driver-internal"]
    sub, _ = live_cache.list_jobs(None, 50, job_kind="submission")
    assert [j.job_id for j in sub] == ["raysubmit_x"]


def test_job_id_matches_kind() -> None:
    assert job_id_matches_kind("01000000", "submission")
    assert not job_id_matches_kind("01000000", "internal")
