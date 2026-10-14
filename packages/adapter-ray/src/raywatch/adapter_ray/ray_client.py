"""HTTP client for Ray dashboard State API."""

from __future__ import annotations

import os
from typing import Any

import httpx
from raywatch.adapter_ray.normalize_tasks import _task_rows_from_payload, task_total_from_payload


def ray_dashboard_base_url() -> str:
    return os.environ.get("RAY_DASHBOARD_URL", "http://127.0.0.1:8265").rstrip("/")


async def fetch_tasks_json(
    client: httpx.AsyncClient,
    *,
    limit: int = 10_000,
) -> dict[str, Any]:
    url = f"{ray_dashboard_base_url()}/api/v0/tasks"
    response = await client.get(url, params={"limit": limit}, timeout=60.0)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray tasks response must be a JSON object")
    return body


async def fetch_all_tasks_json(client: httpx.AsyncClient) -> dict[str, Any]:
    cap = int(os.environ.get("RAYWATCH_RAY_TASKS_FETCH_LIMIT", "10000"))
    body = await fetch_tasks_json(client, limit=min(cap, 500))
    total = task_total_from_payload(body)
    rows = _task_rows_from_payload(body)
    if total is not None and total > len(rows):
        body = await fetch_tasks_json(client, limit=min(total, cap))
    return body


async def fetch_job_logs_text(client: httpx.AsyncClient, submission_id: str) -> str:
    url = f"{ray_dashboard_base_url()}/api/jobs/{submission_id}/logs"
    response = await client.get(url, timeout=60.0)
    response.raise_for_status()
    body = response.json()
    if isinstance(body, dict) and isinstance(body.get("logs"), str):
        return body["logs"]
    if isinstance(body, str):
        return body
    return ""


def _ray_jobs_fetch_limit() -> int:
    return int(os.environ.get("RAYWATCH_RAY_JOBS_FETCH_LIMIT", "500"))


async def fetch_jobs_json(client: httpx.AsyncClient) -> dict[str, Any]:
    # Ray 2.59+: trailing slash returns 404 on some versions.
    url = f"{ray_dashboard_base_url()}/api/v0/jobs"
    response = await client.get(
        url,
        params={"limit": _ray_jobs_fetch_limit()},
        timeout=60.0,
    )
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray jobs response must be a JSON object")
    return body


async def fetch_nodes_json(client: httpx.AsyncClient) -> dict[str, Any]:
    url = f"{ray_dashboard_base_url()}/api/v0/nodes"
    response = await client.get(url, timeout=30.0)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray nodes response must be a JSON object")
    return body


async def fetch_actors_json(client: httpx.AsyncClient) -> dict[str, Any]:
    url = f"{ray_dashboard_base_url()}/api/v0/actors"
    response = await client.get(url, timeout=60.0)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray actors response must be a JSON object")
    return body


async def request_stop_job(client: httpx.AsyncClient, job_id: str) -> None:
    url = f"{ray_dashboard_base_url()}/api/jobs/{job_id}/stop"
    response = await client.post(url, timeout=30.0)
    response.raise_for_status()
