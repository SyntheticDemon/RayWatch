"""Pull from Ray (or fixture) and apply to shared live_cache."""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

import httpx
from raywatch.adapter_ray.normalize_cluster import normalize_actors_payload, normalize_nodes_payload
from raywatch.adapter_ray.normalize_jobs import normalize_jobs_payload
from raywatch.adapter_ray.normalize_objects import normalize_objects_payload
from raywatch.adapter_ray.normalize_tasks import normalize_tasks_payload, task_total_from_payload
from raywatch.adapter_ray.parse_cluster_status import parse_resource_utilization
from raywatch.adapter_ray.ray_client import (
    enrich_jobs_payload_with_details,
    fetch_actors_json,
    fetch_all_tasks_json,
    fetch_cluster_status_json,
    fetch_jobs_json,
    fetch_nodes_json,
    fetch_objects_json,
)
from raywatch.engine.incremental_sync import augment_jobs_batch, augment_tasks_batch
from raywatch.engine.live_cache import LiveCache
from raywatch.engine.sync_side_effects import after_live_sync, job_snapshot_store
from raywatch.engine.task_job_mapping import (
    ray_internal_to_submission_id,
    rekey_tasks_to_submission_ids,
)

logger = logging.getLogger(__name__)

_sync_tick = 0


def _sync_every(env_key: str, default: int) -> int:
    raw = os.environ.get(env_key, str(default))
    try:
        return max(1, int(raw))
    except ValueError:
        return default


def _should_sync_phase(tick: int, every: int) -> bool:
    return tick % every == 0


def _fixture_path() -> Path | None:
    raw = os.environ.get("RAYWATCH_FIXTURE_JOBS")
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


def _cluster_fixture_path(name: str) -> Path | None:
    raw = os.environ.get(f"RAYWATCH_FIXTURE_{name}")
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


def _tasks_fixture_path() -> Path | None:
    raw = os.environ.get("RAYWATCH_FIXTURE_TASKS")
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


async def _apply_cluster_payload(
    live_cache: LiveCache,
    nodes_payload: dict | None,
    actors_payload: dict | None,
    objects_payload: dict | None = None,
    cluster_status_payload: dict | None = None,
) -> None:
    nodes = normalize_nodes_payload(nodes_payload or {})
    actors = normalize_actors_payload(actors_payload or {})
    objects = normalize_objects_payload(objects_payload or {})
    utilization = (
        parse_resource_utilization(cluster_status_payload or {}) if cluster_status_payload else None
    )
    live_cache.set_cluster_snapshot(nodes, actors, objects, utilization)


async def _apply_tasks_payload(
    live_cache: LiveCache,
    payload: dict,
    cluster_epoch: str,
) -> None:
    mapping = ray_internal_to_submission_id(live_cache)
    batch = normalize_tasks_payload(payload, mapping, cluster_epoch=cluster_epoch)
    batch = augment_tasks_batch(
        live_cache,
        batch,
        ray_task_total=task_total_from_payload(payload),
    )
    live_cache.apply_ingest_batch(batch)
    rekey_tasks_to_submission_ids(live_cache, cluster_epoch=cluster_epoch)


async def sync_active_jobs(live_cache: LiveCache) -> None:
    global _sync_tick
    _sync_tick += 1
    tasks_every = _sync_every("RAYWATCH_SYNC_TASKS_EVERY", 1)
    cluster_every = _sync_every("RAYWATCH_SYNC_CLUSTER_EVERY", 2)
    sync_tasks = _should_sync_phase(_sync_tick, tasks_every)
    sync_cluster = _should_sync_phase(_sync_tick, cluster_every)

    fixture = _fixture_path()
    tasks_fixture = _tasks_fixture_path()
    cluster_epoch = "fixture" if fixture else "live"

    if fixture is not None:
        from raywatch.adapter_ray.fixture_loader import load_json_fixture

        payload = load_json_fixture(fixture)
        batch = normalize_jobs_payload(payload, cluster_epoch=cluster_epoch)
        batch = augment_jobs_batch(
            live_cache,
            batch,
            snapshot_store=job_snapshot_store(),
            evict_missing_from_ray=True,
        )
        live_cache.apply_ingest_batch(batch)
        if tasks_fixture is not None:
            task_payload = load_json_fixture(tasks_fixture)
            await _apply_tasks_payload(live_cache, task_payload, cluster_epoch)
        nodes_fixture = _cluster_fixture_path("NODES")
        actors_fixture = _cluster_fixture_path("ACTORS")
        objects_fixture = _cluster_fixture_path("OBJECTS")
        status_fixture = _cluster_fixture_path("CLUSTER_STATUS")
        if nodes_fixture or actors_fixture or objects_fixture or status_fixture:
            nodes_payload = load_json_fixture(nodes_fixture) if nodes_fixture else {}
            actors_payload = load_json_fixture(actors_fixture) if actors_fixture else {}
            objects_payload = load_json_fixture(objects_fixture) if objects_fixture else {}
            status_payload = load_json_fixture(status_fixture) if status_fixture else {}
            await _apply_cluster_payload(
                live_cache,
                nodes_payload,
                actors_payload,
                objects_payload,
                status_payload or None,
            )
        after_live_sync(live_cache)
        return

    try:
        async with httpx.AsyncClient() as client:
            payload = await fetch_jobs_json(client)
            payload = await enrich_jobs_payload_with_details(client, payload)
            batch = normalize_jobs_payload(payload, cluster_epoch=cluster_epoch)
            batch = augment_jobs_batch(
                live_cache,
                batch,
                snapshot_store=job_snapshot_store(),
                evict_missing_from_ray=True,
            )
            live_cache.apply_ingest_batch(batch)
            if sync_tasks:
                tasks_payload = await fetch_all_tasks_json(client)
                await _apply_tasks_payload(live_cache, tasks_payload, cluster_epoch)
            if sync_cluster:
                nodes_payload = await fetch_nodes_json(client)
                actors_payload = await fetch_actors_json(client)
                objects_payload = await fetch_objects_json(client)
                cluster_status_payload = await fetch_cluster_status_json(client)
                await _apply_cluster_payload(
                    live_cache,
                    nodes_payload,
                    actors_payload,
                    objects_payload,
                    cluster_status_payload,
                )
        after_live_sync(live_cache)
    except Exception:
        logger.exception("sync_active_jobs failed")
        live_cache.mark_ray_unreachable()


async def run_sync_loop(live_cache: LiveCache, interval_sec: float = 5.0) -> None:
    while True:
        await sync_active_jobs(live_cache)
        await asyncio.sleep(interval_sec)
