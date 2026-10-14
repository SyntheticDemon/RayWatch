"""NFR: indexed reads stay fast (P1/P2). Fresh HTTP client per sample; p95 includes cold request."""

import time

import pytest
from httpx import ASGITransport, AsyncClient
from raywatch.api.main import app
from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus

from support.latency_stats import percentile_ms


def _seed_jobs(count: int) -> None:
    live_cache.reset()
    ops = [
        IngestOp(
            kind="upsert_job",
            job=JobDetail(
                job_id=f"job-{index:05d}",
                status=JobStatus.RUNNING,
                entrypoint="python work.py",
            ),
        )
        for index in range(count)
    ]
    live_cache.apply_ingest_batch(IngestBatch(ops=ops))


async def _sample_get_ms(path: str, iterations: int) -> list[float]:
    samples_ms: list[float] = []
    for _ in range(iterations):
        transport = ASGITransport(app=app)
        start = time.perf_counter()
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(path)
            assert response.status_code == 200
        samples_ms.append((time.perf_counter() - start) * 1000)
    return samples_ms


@pytest.mark.asyncio
async def test_jobs_list_p95_under_200ms_for_1000_jobs() -> None:
    _seed_jobs(1000)
    samples_ms = await _sample_get_ms("/jobs?limit=50", 30)
    p95 = percentile_ms(samples_ms, 0.95)
    assert samples_ms[0] < 200.0, f"cold={samples_ms[0]:.2f}ms"
    assert p95 < 200.0, f"p95={p95:.2f}ms (includes cold) samples={samples_ms[:5]}…"


@pytest.mark.asyncio
async def test_job_get_p95_under_100ms() -> None:
    _seed_jobs(500)
    samples_ms = await _sample_get_ms("/jobs/job-00250", 30)
    p95 = percentile_ms(samples_ms, 0.95)
    assert samples_ms[0] < 100.0, f"cold={samples_ms[0]:.2f}ms"
    assert p95 < 100.0, f"p95={p95:.2f}ms"
