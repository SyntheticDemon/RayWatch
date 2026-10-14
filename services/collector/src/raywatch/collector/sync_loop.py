"""Pull from Ray (or fixture) and apply to shared live_cache."""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

import httpx
from raywatch.adapter_ray.normalize_jobs import normalize_jobs_payload
from raywatch.adapter_ray.ray_client import fetch_jobs_json
from raywatch.engine.live_cache import LiveCache

logger = logging.getLogger(__name__)


def _fixture_path() -> Path | None:
    raw = os.environ.get("RAYWATCH_FIXTURE_JOBS")
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


async def sync_active_jobs(live_cache: LiveCache) -> None:
    fixture = _fixture_path()
    if fixture is not None:
        from raywatch.adapter_ray.fixture_loader import load_json_fixture

        payload = load_json_fixture(fixture)
        batch = normalize_jobs_payload(payload)
        live_cache.apply_ingest_batch(batch)
        return

    try:
        async with httpx.AsyncClient() as client:
            payload = await fetch_jobs_json(client)
        batch = normalize_jobs_payload(payload)
        live_cache.apply_ingest_batch(batch)
    except Exception:
        logger.exception("sync_active_jobs failed")
        live_cache.mark_ray_unreachable()


async def run_sync_loop(live_cache: LiveCache, interval_sec: float = 5.0) -> None:
    while True:
        await sync_active_jobs(live_cache)
        await asyncio.sleep(interval_sec)
