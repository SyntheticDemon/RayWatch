"""Stop job API behavior."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_stop_unknown_job_returns_404(api_client: AsyncClient) -> None:
    response = await api_client.post("/jobs/does-not-exist/stop")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "JOB_NOT_FOUND"


@pytest.mark.asyncio
async def test_stop_job_attempts_ray_call(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[str] = []

    async def fake_stop(_client: object, job_id: str) -> None:
        calls.append(job_id)

    monkeypatch.setattr("raywatch.api.routes.jobs.request_stop_job", fake_stop)
    response = await api_client.post("/jobs/01000000/stop")
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert calls == ["01000000"]


@pytest.mark.asyncio
async def test_stop_job_surfaces_ray_failure(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fail_stop(_client: object, _job_id: str) -> None:
        raise RuntimeError("ray refused")

    monkeypatch.setattr("raywatch.api.routes.jobs.request_stop_job", fail_stop)
    response = await api_client.post("/jobs/01000000/stop")
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is False
    assert "ray refused" in body["message"]
