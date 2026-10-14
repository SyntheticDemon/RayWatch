"""Guard against perf tests that hide cold latency or reuse warmed HTTP clients."""

import pytest
from httpx import ASGITransport
from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus

from support.perf_harness import reset_live_cache, seed_jobs
from support.request_latency import measure_fresh_client


def test_live_cache_reset_drops_all_jobs() -> None:
    seed_jobs(10)
    assert live_cache.job_count() == 10
    reset_live_cache()
    assert live_cache.job_count() == 0
    assert live_cache._state.job_ids_sorted == []


@pytest.mark.asyncio
async def test_fresh_client_creates_new_transport_each_sample(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    live_cache.reset()
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id="j1", status=JobStatus.RUNNING, entrypoint="x"),
                )
            ]
        )
    )
    created = 0
    real_transport = ASGITransport

    class CountingTransport(real_transport):  # type: ignore[misc,valid-type]
        def __init__(self, *args: object, **kwargs: object) -> None:
            nonlocal created
            created += 1
            super().__init__(*args, **kwargs)

    monkeypatch.setattr("support.request_latency.ASGITransport", CountingTransport)
    report = await measure_fresh_client("/jobs?limit=10", iterations=5, warmup=0)
    assert created == 5
    assert report.cold_ms > 0
    assert report.steady.n == 5


@pytest.mark.asyncio
async def test_warmup_excludes_timed_samples_from_cold_but_zero_by_default() -> None:
    live_cache.reset()
    seed_jobs(50)
    cold = await measure_fresh_client("/jobs?limit=10", iterations=3, warmup=0)
    assert cold.steady.n == 3
