import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_trigger_sync_endpoint(api_client: AsyncClient) -> None:
    response = await api_client.post("/sync/trigger")
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert body["job_count"] >= 1
    assert "sync" in body


@pytest.mark.asyncio
async def test_list_jobs_sort_started_at(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs?sort=started_at&limit=10")
    assert response.status_code == 200
    assert "items" in response.json()
