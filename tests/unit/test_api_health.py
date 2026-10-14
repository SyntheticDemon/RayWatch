"""API contract smoke tests."""

import pytest
from httpx import ASGITransport, AsyncClient
from raywatch.api.main import app
from raywatch.api.state import live_cache


@pytest.mark.asyncio
async def test_health_ok_before_first_sync() -> None:
    live_cache.reset()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        ready = await client.get("/ready")
        assert ready.json()["ready"] is False


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
