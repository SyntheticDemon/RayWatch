"""Collector sync loop: fixture ingest and Ray failure handling."""

import json
from pathlib import Path

from unittest.mock import AsyncMock

import httpx
import pytest
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"


@pytest.mark.asyncio
async def test_sync_active_jobs_loads_fixture(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE))
    await sync_active_jobs(live_cache)
    assert live_cache.job_count() == 2
    assert live_cache.sync_meta().ray_out_of_sync is False


@pytest.mark.asyncio
async def test_sync_active_jobs_marks_unreachable_on_http_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("RAYWATCH_FIXTURE_JOBS", raising=False)

    async def fail_fetch(*_args: object, **_kwargs: object) -> None:
        raise httpx.ConnectError("ray down")

    monkeypatch.setattr(
        "raywatch.collector.sync_loop.fetch_jobs_json",
        fail_fetch,
    )
    await sync_active_jobs(live_cache)
    assert live_cache.sync_meta().ray_out_of_sync is True


@pytest.mark.asyncio
async def test_sync_active_jobs_missing_fixture_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", "/nonexistent/jobs.json")
    monkeypatch.setattr(
        "raywatch.collector.sync_loop.fetch_jobs_json",
        AsyncMock(side_effect=httpx.ConnectError("no ray")),
    )
    await sync_active_jobs(live_cache)
    assert live_cache.sync_meta().ray_out_of_sync is True
