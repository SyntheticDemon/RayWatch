import httpx
import pytest
from raywatch.adapter_ray.ray_client import fetch_job_logs_text, fetch_tasks_json


@pytest.mark.asyncio
async def test_fetch_tasks_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://ray.test:8265")

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v0/tasks"
        assert request.url.params.get("limit") == "100"
        return httpx.Response(200, json={"data": {"result": {"result": []}}})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        body = await fetch_tasks_json(client, limit=100)
    assert "data" in body


@pytest.mark.asyncio
async def test_fetch_job_logs_text(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://ray.test:8265")

    async def handler(request: httpx.Request) -> httpx.Response:
        assert "/api/jobs/sub123/logs" in str(request.url)
        return httpx.Response(200, json={"logs": "hello"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        text = await fetch_job_logs_text(client, "sub123")
    assert text == "hello"
