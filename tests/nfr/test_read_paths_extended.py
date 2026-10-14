"""NFR P1: additional indexed read paths (tasks, cluster, search)."""

import time

import pytest
from httpx import ASGITransport, AsyncClient
from raywatch.api.main import app
from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus
from raywatch.model.task import TaskStatus, TaskSummary

from support.latency_stats import percentile_ms


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


def _seed_job_with_tasks(task_count: int) -> tuple[str, str]:
    live_cache.reset()
    job_id = "nfr-job-00001"
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id=job_id, status=JobStatus.RUNNING, entrypoint="work"),
                )
            ]
        )
    )
    tasks = [
        IngestOp(
            kind="upsert_task",
            task=TaskSummary(
                task_id=f"nfr-task-{i:05d}",
                job_id=job_id,
                status=TaskStatus.FINISHED,
                name="t",
            ),
        )
        for i in range(task_count)
    ]
    live_cache.apply_ingest_batch(IngestBatch(ops=tasks))
    return job_id, "nfr-task-00050"


@pytest.mark.asyncio
async def test_cluster_overview_p95_under_100ms() -> None:
    live_cache.reset()
    samples = await _sample_get_ms("/cluster/overview", 25)
    p95 = percentile_ms(samples, 0.95)
    assert p95 < 100.0, f"p95={p95:.2f}ms"


@pytest.mark.asyncio
async def test_task_get_p95_under_100ms() -> None:
    _, task_id = _seed_job_with_tasks(200)
    samples = await _sample_get_ms(f"/tasks/{task_id}", 25)
    p95 = percentile_ms(samples, 0.95)
    assert p95 < 100.0, f"p95={p95:.2f}ms"


@pytest.mark.asyncio
async def test_job_tasks_list_p95_under_200ms_for_500_tasks() -> None:
    job_id, _ = _seed_job_with_tasks(500)
    samples = await _sample_get_ms(f"/jobs/{job_id}/tasks?limit=100", 25)
    p95 = percentile_ms(samples, 0.95)
    assert p95 < 200.0, f"p95={p95:.2f}ms"
