"""NFR P3/P5: live Ray ingest lag and log fetch latency."""

import os
import time

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from raywatch.api.main import app
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

pytestmark = pytest.mark.integration


def _require_live_ray() -> None:
    if os.environ.get("RAY_INTEGRATION") != "1":
        pytest.skip("Set RAY_INTEGRATION=1 with Ray head on :8265")


@pytest.mark.asyncio
async def test_sync_delay_under_5s_after_live_fetch(monkeypatch: pytest.MonkeyPatch) -> None:
    _require_live_ray()
    monkeypatch.delenv("RAYWATCH_FIXTURE_JOBS", raising=False)
    monkeypatch.setenv("RAYWATCH_USE_LIVE", "1")
    monkeypatch.setenv("RAY_DASHBOARD_URL", os.environ.get("RAY_DASHBOARD_URL", "http://127.0.0.1:8265"))

    live_cache.reset()
    start = time.perf_counter()
    await sync_active_jobs(live_cache)
    elapsed = time.perf_counter() - start
    sync = live_cache.sync_meta()
    assert sync.last_sync_at is not None
    assert sync.sync_delay_ms is not None
    assert sync.sync_delay_ms < 5000, f"sync_delay_ms={sync.sync_delay_ms}"
    assert elapsed < 30.0, f"sync_active_jobs wall={elapsed:.1f}s"


@pytest.mark.asyncio
async def test_live_job_logs_fetch_under_2s(monkeypatch: pytest.MonkeyPatch) -> None:
    _require_live_ray()
    monkeypatch.delenv("RAYWATCH_FIXTURE_JOBS", raising=False)
    monkeypatch.setenv("RAYWATCH_USE_LIVE", "1")
    dash = os.environ.get("RAY_DASHBOARD_URL", "http://127.0.0.1:8265")

    job_id = None
    async with httpx.AsyncClient() as client:
        payload = await client.get(f"{dash}/api/v0/jobs", timeout=30)
        payload.raise_for_status()
        rows = payload.json().get("data", {}).get("result", {}).get("result", [])
        for row in rows:
            sid = row.get("submission_id") or ""
            if sid.startswith("raysubmit_"):
                job_id = sid
                break
    if not job_id:
        pytest.skip("No submission jobs on Ray head")

    live_cache.reset()
    await sync_active_jobs(live_cache)
    transport = ASGITransport(app=app)
    start = time.perf_counter()
    async with AsyncClient(transport=transport, base_url="http://test") as api:
        response = await api.get(f"/jobs/{job_id}/logs?tail_lines=20")
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert response.status_code == 200
    assert elapsed_ms < 2000.0, f"live logs path {elapsed_ms:.1f}ms"
