"""Integration tests against a real Ray head (not fixtures)."""

import os

import httpx
import pytest

from raywatch.adapter_ray.normalize_jobs import normalize_jobs_payload
from raywatch.adapter_ray.ray_client import fetch_jobs_json, ray_dashboard_base_url

pytestmark = pytest.mark.integration


def _integration_required() -> None:
    if os.environ.get("RAYWATCH_FIXTURE_JOBS"):
        pytest.skip("RAYWATCH_FIXTURE_JOBS is set; use live Ray only")
    if os.environ.get("RAY_INTEGRATION") != "1":
        pytest.skip("Set RAY_INTEGRATION=1 to run live Ray tests")


@pytest.mark.asyncio
async def test_ray_dashboard_reachable() -> None:
    _integration_required()
    url = f"{ray_dashboard_base_url()}/api/version"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
    except httpx.HTTPError as exc:
        pytest.fail(f"Ray dashboard not reachable at {url}: {exc}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_fetch_and_normalize_real_jobs_payload() -> None:
    _integration_required()
    try:
        async with httpx.AsyncClient() as client:
            payload = await fetch_jobs_json(client)
    except httpx.HTTPError as exc:
        pytest.fail(f"Ray jobs API unavailable: {exc}")

    batch = normalize_jobs_payload(payload, cluster_epoch="live")
    assert isinstance(batch.ops, list)
    # Empty cluster is valid; shape must parse.
    for op in batch.ops:
        assert op.job is not None
        assert op.job.job_id


@pytest.mark.asyncio
async def test_sync_ingests_tasks_when_cluster_has_tasks() -> None:
    _integration_required()
    from raywatch.api.state import live_cache
    from raywatch.collector.sync_loop import sync_active_jobs

    await sync_active_jobs(live_cache)
    # Cluster may have zero tasks; if Ray returns tasks, we must index them.
    if live_cache.task_count() > 0:
        task_id = next(iter(live_cache._state.tasks.keys()))
        assert live_cache.get_task(task_id) is not None
