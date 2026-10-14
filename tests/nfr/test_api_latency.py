"""Convincing NFR smoke: indexed reads stay fast (P1/P2 targets)."""

import time

import pytest
from httpx import ASGITransport, AsyncClient
from raywatch.api.main import app
from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus


def _seed_jobs(count: int) -> None:
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


@pytest.mark.asyncio
async def test_jobs_list_p95_under_200ms_for_1000_jobs() -> None:
    _seed_jobs(1000)
    transport = ASGITransport(app=app)
    samples_ms: list[float] = []
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for _ in range(30):
            start = time.perf_counter()
            response = await client.get("/jobs?limit=50")
            elapsed_ms = (time.perf_counter() - start) * 1000
            assert response.status_code == 200
            samples_ms.append(elapsed_ms)
    ordered = sorted(samples_ms)
    p95 = ordered[int(0.95 * len(ordered)) - 1]
    assert p95 < 200.0, f"p95={p95:.2f}ms samples={samples_ms}"


@pytest.mark.asyncio
async def test_job_get_p95_under_100ms() -> None:
    _seed_jobs(500)
    transport = ASGITransport(app=app)
    samples_ms: list[float] = []
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for _ in range(30):
            start = time.perf_counter()
            response = await client.get("/jobs/job-00250")
            elapsed_ms = (time.perf_counter() - start) * 1000
            assert response.status_code == 200
            samples_ms.append(elapsed_ms)
    ordered = sorted(samples_ms)
    p95 = ordered[int(0.95 * len(ordered)) - 1]
    assert p95 < 100.0, f"p95={p95:.2f}ms"
