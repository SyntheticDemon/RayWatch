"""Collector can skip heavy Ray polls on alternating ticks."""

import pytest
from raywatch.api.state import live_cache
from raywatch.collector import sync_loop


@pytest.fixture(autouse=True)
def _reset_sync_tick() -> None:
    sync_loop._sync_tick = 0
    yield
    sync_loop._sync_tick = 0


@pytest.mark.asyncio
async def test_sync_skips_tasks_and_cluster_when_every_is_two(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("RAYWATCH_FIXTURE_JOBS", raising=False)
    monkeypatch.setenv("RAYWATCH_SYNC_TASKS_EVERY", "2")
    monkeypatch.setenv("RAYWATCH_SYNC_CLUSTER_EVERY", "2")

    jobs_payload = {
        "data": {
            "result": {
                "result": [
                    {
                        "submission_id": "raysubmit_demo",
                        "entrypoint": "python x.py",
                        "status": "RUNNING",
                    }
                ]
            }
        }
    }
    calls = {"tasks": 0, "cluster": 0}

    async def fake_jobs(_client: object) -> dict:
        return jobs_payload

    async def fake_enrich(_client: object, payload: dict) -> dict:
        return payload

    async def fake_tasks(_client: object) -> dict:
        calls["tasks"] += 1
        return {"data": {"result": {"result": []}}}

    async def fake_nodes(_client: object) -> dict:
        calls["cluster"] += 1
        return {}

    async def fake_actors(_client: object) -> dict:
        return {}

    async def fake_objects(_client: object) -> dict:
        return {}

    async def fake_status(_client: object) -> dict:
        return {}

    monkeypatch.setattr("raywatch.collector.sync_loop.fetch_jobs_json", fake_jobs)
    monkeypatch.setattr("raywatch.collector.sync_loop.enrich_jobs_payload_with_details", fake_enrich)
    monkeypatch.setattr("raywatch.collector.sync_loop.fetch_all_tasks_json", fake_tasks)
    monkeypatch.setattr("raywatch.collector.sync_loop.fetch_nodes_json", fake_nodes)
    monkeypatch.setattr("raywatch.collector.sync_loop.fetch_actors_json", fake_actors)
    monkeypatch.setattr("raywatch.collector.sync_loop.fetch_objects_json", fake_objects)
    monkeypatch.setattr("raywatch.collector.sync_loop.fetch_cluster_status_json", fake_status)

    await sync_loop.sync_active_jobs(live_cache)
    assert calls == {"tasks": 0, "cluster": 0}

    await sync_loop.sync_active_jobs(live_cache)
    assert calls == {"tasks": 1, "cluster": 1}
