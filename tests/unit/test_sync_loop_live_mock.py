"""Live sync path with mocked Ray HTTP (jobs + tasks)."""

import pytest
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs


@pytest.mark.asyncio
async def test_sync_live_applies_jobs_and_tasks(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("RAYWATCH_FIXTURE_JOBS", raising=False)
    monkeypatch.delenv("RAYWATCH_FIXTURE_TASKS", raising=False)

    jobs_payload = {
        "data": {
            "result": {
                "result": [
                    {
                        "submission_id": "raysubmit_demo",
                        "job_id": "0a000000",
                        "entrypoint": "python x.py",
                        "status": "SUCCEEDED",
                    }
                ]
            }
        }
    }
    tasks_payload = {
        "data": {
            "result": {
                "result": [
                    {
                        "task_id": "task-hex-1",
                        "job_id": "0a000000",
                        "state": "FINISHED",
                        "name": "fn",
                    }
                ]
            }
        }
    }

    async def fake_jobs(_client: object) -> dict:
        return jobs_payload

    async def fake_tasks(_client: object, **kwargs: object) -> dict:
        return tasks_payload

    monkeypatch.setattr("raywatch.collector.sync_loop.fetch_jobs_json", fake_jobs)
    monkeypatch.setattr("raywatch.collector.sync_loop.fetch_all_tasks_json", fake_tasks)

    await sync_active_jobs(live_cache)
    assert live_cache.job_count() == 1
    assert live_cache.get_job("raysubmit_demo") is not None
    assert live_cache.task_count() == 1
    task = live_cache.get_task("task-hex-1")
    assert task is not None
    assert task.job_id == "raysubmit_demo"
