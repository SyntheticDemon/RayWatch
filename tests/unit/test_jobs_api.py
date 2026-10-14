import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_jobs_from_fixture(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 2
    assert body["sync"]["source"] == "live_cache"
    assert body["sync"]["ray_out_of_sync"] is False
    assert body["sync"]["sync_delay_ms"] is not None


@pytest.mark.asyncio
async def test_get_job_detail(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs/01000000")
    assert response.status_code == 200
    job = response.json()["job"]
    assert job["job_id"] == "01000000"
    assert job["status"] == "RUNNING"
    assert job["metadata"]["user"] == "demo"


@pytest.mark.asyncio
async def test_freshness_endpoint(api_client: AsyncClient) -> None:
    response = await api_client.get("/freshness")
    assert response.status_code == 200
    body = response.json()
    assert body["job_count"] == 2
    assert "sync_delay_ms" in body["sync"]
