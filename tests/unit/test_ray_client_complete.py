import httpx
import pytest
from raywatch.adapter_ray.ray_client import fetch_jobs_json, fetch_tasks_json


@pytest.mark.asyncio
async def test_fetch_jobs_json_rejects_non_object(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://ray.test:8265")

    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[])

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(ValueError, match="JSON object"):
            await fetch_jobs_json(client)


@pytest.mark.asyncio
async def test_fetch_tasks_json_rejects_non_object(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://ray.test:8265")

    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json="bad")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(ValueError, match="JSON object"):
            await fetch_tasks_json(client)
