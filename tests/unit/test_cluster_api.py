from pathlib import Path

import pytest
from httpx import AsyncClient
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

FIXTURE_JOBS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"
FIXTURE_NODES = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "nodes.json"
FIXTURE_ACTORS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "actors.json"


@pytest.mark.asyncio
async def test_cluster_nodes_and_actors_from_fixtures(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    monkeypatch.setenv("RAYWATCH_FIXTURE_NODES", str(FIXTURE_NODES))
    monkeypatch.setenv("RAYWATCH_FIXTURE_ACTORS", str(FIXTURE_ACTORS))
    await sync_active_jobs(live_cache)

    nodes = await api_client.get("/cluster/nodes")
    assert nodes.status_code == 200
    body = nodes.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["node_id"] == "node-abc"

    actors = await api_client.get("/cluster/actors")
    assert actors.status_code == 200
    assert actors.json()["items"][0]["actor_id"] == "actor-demo-1"

    one = await api_client.get("/cluster/actors/actor-demo-1")
    assert one.status_code == 200
    assert one.json()["actor"]["class_name"] == "Counter"
