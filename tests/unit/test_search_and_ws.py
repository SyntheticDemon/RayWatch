from pathlib import Path

import pytest
from httpx import AsyncClient
from raywatch.api.main import app
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs
from raywatch.engine.live_hub import live_hub
from starlette.testclient import TestClient

FIXTURE_JOBS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"
FIXTURE_TASKS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "tasks_list_2_59.json"


@pytest.mark.asyncio
async def test_search_returns_job_hit(api_client: AsyncClient) -> None:
    jobs = await api_client.get("/jobs?limit=1")
    job_id = jobs.json()["items"][0]["job_id"]
    response = await api_client.get(f"/search?q={job_id[:8]}")
    assert response.status_code == 200
    body = response.json()
    assert any(h["kind"] == "job" for h in body["items"])


def test_websocket_receives_sync_event(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    live_cache.reset()
    with TestClient(app) as client, client.websocket_connect("/ws/live") as ws:
        import asyncio

        asyncio.run(sync_active_jobs(live_cache))
        message = ws.receive_json()
    assert message["type"] == "sync"
    assert "job_count" in message


def test_websocket_job_scope_includes_tasks_preview(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    monkeypatch.setenv("RAYWATCH_FIXTURE_TASKS", str(FIXTURE_TASKS))
    live_cache.reset()
    with TestClient(app) as client, client.websocket_connect("/ws/live?job_id=01000000") as ws:
        import asyncio

        asyncio.run(sync_active_jobs(live_cache))
        message = ws.receive_json()
    assert message["type"] == "sync"
    assert message["job_id"] == "01000000"
    assert message["job"]["job_id"] == "01000000"
    assert len(message["tasks_preview"]) >= 1


def test_websocket_job_logs_fixture(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    live_cache.reset()
    with TestClient(app) as client, client.websocket_connect("/ws/job-logs?job_id=01000000") as ws:
        text = ws.receive_text()
    assert "train" in text.lower() or len(text) > 0


def test_live_hub_publish_subscribe() -> None:
    queue = live_hub.subscribe("*")
    live_hub.publish("*", {"type": "ping"})
    assert queue.get_nowait()["type"] == "ping"
    live_hub.unsubscribe("*", queue)
