"""Actor logs stay scoped to one worker (pid + node), not cluster-wide."""

import pytest
from httpx import AsyncClient
from pathlib import Path

from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

FIXTURE_JOBS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"
FIXTURE_ACTORS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "actors.json"


@pytest.mark.asyncio
async def test_actor_logs_from_fixture_file(api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    monkeypatch.setenv("RAYWATCH_FIXTURE_ACTORS", str(FIXTURE_ACTORS))
    await sync_active_jobs(live_cache)

    response = await api_client.get("/cluster/actors/actor-demo-1/logs")
    assert response.status_code == 200
    body = response.json()
    assert "actor-demo-1" in body["logs"]
    assert body["error_message"] is None


@pytest.mark.asyncio
async def test_jobs_list_does_not_call_ray_during_read(api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def ray_during_read(*_args: object, **_kwargs: object) -> dict:
        raise AssertionError("Ray HTTP must not run during indexed API reads")

    monkeypatch.setattr("raywatch.adapter_ray.ray_client.fetch_jobs_json", ray_during_read)
    response = await api_client.get("/jobs")
    assert response.status_code == 200
    assert len(response.json()["items"]) >= 1
