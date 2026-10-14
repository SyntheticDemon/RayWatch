from pathlib import Path

import pytest
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

FIXTURE_JOBS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"
FIXTURE_TASKS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "tasks_list_2_59.json"


@pytest.mark.asyncio
async def test_sync_loads_jobs_and_tasks_fixtures(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    monkeypatch.setenv("RAYWATCH_FIXTURE_TASKS", str(FIXTURE_TASKS))
    await sync_active_jobs(live_cache)
    assert live_cache.job_count() == 3
    assert live_cache.task_count() == 4
    items, _ = live_cache.list_tasks_for_job("01000000", cursor=None, limit=10)
    assert len(items) == 2
