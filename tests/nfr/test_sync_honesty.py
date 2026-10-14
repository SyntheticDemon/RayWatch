import pytest
from httpx import AsyncClient
from raywatch.api.state import live_cache


@pytest.mark.asyncio
async def test_ray_unreachable_sets_out_of_sync(api_client: AsyncClient) -> None:
    live_cache.mark_ray_unreachable()
    response = await api_client.get("/freshness")
    body = response.json()
    assert body["sync"]["ray_out_of_sync"] is True
