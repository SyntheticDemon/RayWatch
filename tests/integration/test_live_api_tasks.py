"""Live API: tasks list after sync (requires demo-ray + RAY_INTEGRATION=1)."""

import os

import pytest
from httpx import ASGITransport, AsyncClient
from raywatch.api.main import app
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_live_sync_then_list_job_tasks() -> None:
    if os.environ.get("RAY_INTEGRATION") != "1":
        pytest.skip("Set RAY_INTEGRATION=1")
    await sync_active_jobs(live_cache)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        jobs = await client.get("/jobs?limit=5")
    assert jobs.status_code == 200
    items = jobs.json()["items"]
    if not items:
        pytest.skip("No jobs in live cache; run make demo-ray first")
    job_id = items[0]["job_id"]
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tasks = await client.get(f"/jobs/{job_id}/tasks?limit=100")
    assert tasks.status_code == 200
    body = tasks.json()
    assert "items" in body
    assert "sync" in body
