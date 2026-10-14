"""NFR P5: job log tail returns within 2s (indexed / cached path)."""

import time

import pytest
from httpx import ASGITransport, AsyncClient
from raywatch.adapter_ray.log_fetch_cache import put_cached_log
from raywatch.api.main import app
from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus


@pytest.mark.asyncio
async def test_job_logs_first_response_under_2s() -> None:
    live_cache.reset()
    job_id = "nfr-log-job"
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id=job_id, status=JobStatus.SUCCEEDED, entrypoint="x"),
                )
            ]
        )
    )
    epoch = live_cache.sync_meta().cluster_epoch
    put_cached_log(epoch, job_id, "\n".join(f"line {i}" for i in range(200)))

    transport = ASGITransport(app=app)
    start = time.perf_counter()
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/jobs/{job_id}/logs?tail_lines=50")
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert response.status_code == 200
    body = response.json()
    assert body.get("logs")
    assert elapsed_ms < 2000.0, f"first byte path took {elapsed_ms:.1f}ms"
