"""Ray dashboard HTTP client (mocked transport)."""

import httpx
import pytest
from raywatch.adapter_ray.ray_client import (
    fetch_jobs_json,
    ray_dashboard_base_url,
    request_stop_job,
)


@pytest.mark.asyncio
async def test_fetch_jobs_json_uses_v0_path_without_trailing_slash(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://ray.test:8265")
    captured: list[str] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        captured.append(str(request.url))
        return httpx.Response(200, json={"data": {}})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        body = await fetch_jobs_json(client)
    assert body == {"data": {}}
    assert captured == ["http://ray.test:8265/api/v0/jobs?limit=500"]


@pytest.mark.asyncio
async def test_request_stop_job_posts_to_jobs_api(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://ray.test:8265")
    captured: list[tuple[str, str]] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        captured.append((request.method, str(request.url)))
        return httpx.Response(200, json={"ok": True})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        await request_stop_job(client, "job-abc")
    assert captured == [("POST", "http://ray.test:8265/api/jobs/job-abc/stop")]


def test_ray_dashboard_base_url_strips_trailing_slash(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://localhost:8265/")
    assert ray_dashboard_base_url() == "http://localhost:8265"
