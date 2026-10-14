"""API workflow: internal driver jobs and nested tasks (fixture-backed)."""

from pathlib import Path

import pytest
from httpx import AsyncClient
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

FIXTURE_JOBS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"
FIXTURE_TASKS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "tasks_list_2_59.json"


@pytest.mark.asyncio
async def test_internal_job_kind_lists_driver_job(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    monkeypatch.setenv("RAYWATCH_FIXTURE_TASKS", str(FIXTURE_TASKS))
    await sync_active_jobs(live_cache)

    internal = await api_client.get("/jobs", params={"job_kind": "internal"})
    assert internal.status_code == 200
    ids = [row["job_id"] for row in internal.json()["items"]]
    assert "ray_driver_nested_demo" in ids
    assert "01000000" not in ids

    tasks = await api_client.get("/jobs/ray_driver_nested_demo/tasks")
    assert tasks.status_code == 200
    names = {t["name"] for t in tasks.json()["items"]}
    assert "driver_root" in names
    assert "driver_child" in names

    child = next(t for t in tasks.json()["items"] if t["name"] == "driver_child")
    assert child["parent_task_id"] is not None
