"""Contract tests for every HTTP route (success + error paths)."""

from pathlib import Path

import pytest
from httpx import AsyncClient
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

FIXTURE_JOBS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"
FIXTURE_TASKS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "tasks_list_2_59.json"


@pytest.mark.asyncio
async def test_list_jobs_pagination_cursor(api_client: AsyncClient) -> None:
    page1 = await api_client.get("/jobs?limit=1")
    assert page1.status_code == 200
    body1 = page1.json()
    assert len(body1["items"]) == 1
    assert body1["next_cursor"] is not None
    page2 = await api_client.get(f"/jobs?limit=1&cursor={body1['next_cursor']}")
    assert page2.status_code == 200
    body2 = page2.json()
    assert body2["items"][0]["job_id"] != body1["items"][0]["job_id"]


@pytest.mark.asyncio
async def test_list_jobs_invalid_limit_returns_422(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs?limit=0")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_job_not_found(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs/missing-job-id")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "JOB_NOT_FOUND"


@pytest.mark.asyncio
async def test_list_job_tasks_not_found(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs/missing-job-id/tasks")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_job_tasks_pagination(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    monkeypatch.setenv("RAYWATCH_FIXTURE_TASKS", str(FIXTURE_TASKS))
    await sync_active_jobs(live_cache)
    page = await api_client.get("/jobs/01000000/tasks?limit=1")
    assert page.status_code == 200
    body = page.json()
    assert len(body["items"]) == 1
    if body["next_cursor"]:
        page2 = await api_client.get(f"/jobs/01000000/tasks?limit=1&cursor={body['next_cursor']}")
        assert page2.status_code == 200


@pytest.mark.asyncio
async def test_job_logs_returns_error_payload_not_500(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def boom(_client: object, _job_id: str) -> str:
        raise RuntimeError("ray logs down")

    async def boom_logs(_job, *, cluster_epoch: str) -> str:
        raise RuntimeError("ray logs down")

    monkeypatch.setattr("raywatch.api.routes.jobs.fetch_logs_for_job", boom_logs)
    response = await api_client.get("/jobs/01000000/logs")
    assert response.status_code == 200
    body = response.json()
    assert body["logs"] == ""
    assert "ray logs down" in body["error_message"]


@pytest.mark.asyncio
async def test_job_logs_not_found(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs/missing-job-id/logs")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_task_not_found(api_client: AsyncClient) -> None:
    response = await api_client.get("/tasks/no-such-task")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "TASK_NOT_FOUND"


@pytest.mark.asyncio
async def test_freshness_includes_task_count(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    monkeypatch.setenv("RAYWATCH_FIXTURE_TASKS", str(FIXTURE_TASKS))
    await sync_active_jobs(live_cache)
    response = await api_client.get("/freshness")
    assert response.status_code == 200
    body = response.json()
    assert body["task_count"] == 4
    assert body["job_count"] == 3
    assert "sync" in body


@pytest.mark.asyncio
async def test_jobs_list_response_schema_keys(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs")
    body = response.json()
    assert set(body.keys()) == {"items", "next_cursor", "sync"}
    sync = body["sync"]
    for key in ("source", "last_sync_at", "sync_delay_ms", "ray_out_of_sync", "cluster_epoch"):
        assert key in sync
    if body["items"]:
        job = body["items"][0]
        for key in (
            "job_id",
            "status",
            "entrypoint",
            "task_running",
            "task_failed",
            "task_total",
            "error_message",
        ):
            assert key in job


@pytest.mark.asyncio
async def test_job_detail_response_schema(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs/01000000")
    body = response.json()
    assert "job" in body and "sync" in body
    job = body["job"]
    assert "metadata" in job
    assert "driver_pid" in job
