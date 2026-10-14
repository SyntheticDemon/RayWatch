"""Optional: run after make demo-ray with API live (RAY_INTEGRATION=1)."""

import os

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from raywatch.api.main import app

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_job_logs_shape_from_fixture_api() -> None:
    if os.environ.get("RAY_INTEGRATION") != "1":
        pytest.skip("Set RAY_INTEGRATION=1")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        jobs = await client.get("/jobs?limit=5")
        if jobs.status_code != 200 or not jobs.json()["items"]:
            pytest.skip("No jobs in cache; run make demo-ray and dev-api-live first")
        job_id = jobs.json()["items"][0]["job_id"]
        logs = await client.get(f"/jobs/{job_id}/logs")
    assert logs.status_code == 200
    body = logs.json()
    assert "logs" in body
    assert "sync" in body
    if body.get("error_message"):
        pytest.skip(f"Ray logs unavailable in this env: {body['error_message']}")
