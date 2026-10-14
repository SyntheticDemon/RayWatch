"""Shared pytest fixtures."""

from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from raywatch.api.main import app
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs

FIXTURE_JOBS = Path(__file__).resolve().parent / "fixtures" / "ray" / "jobs_list.json"


@pytest.fixture(autouse=True)
def _reset_live_cache() -> None:
    live_cache.reset()


@pytest.fixture
async def api_client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncClient]:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    await sync_active_jobs(live_cache)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
