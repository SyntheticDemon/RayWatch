"""API contract smoke tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(api_client: AsyncClient) -> None:
    response = await api_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_ready_after_fixture_sync(api_client: AsyncClient) -> None:
    response = await api_client.get("/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["ready"] is True
    assert body["ray_out_of_sync"] is False
    assert body["job_count"] >= 1


@pytest.mark.asyncio
async def test_ready_false_when_cache_never_synced(api_client: AsyncClient) -> None:
    from raywatch.api.state import live_cache

    live_cache.reset()
    response = await api_client.get("/ready")
    assert response.status_code == 200
    assert response.json()["ready"] is False
