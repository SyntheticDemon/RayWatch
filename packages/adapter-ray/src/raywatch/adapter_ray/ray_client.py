"""HTTP client for Ray dashboard State API."""

from __future__ import annotations

import asyncio
import os
from typing import Any

import httpx
from raywatch.adapter_ray.normalize_jobs import _job_rows_from_payload
from raywatch.adapter_ray.normalize_tasks import _task_rows_from_payload, task_total_from_payload


def ray_dashboard_base_url() -> str:
    """Ray head HTTP API base (State / jobs / tasks). Not the Ray Dashboard browser UI."""
    raw = os.environ.get("RAY_HEAD_API_URL") or os.environ.get("RAY_DASHBOARD_URL")
    return (raw or "http://127.0.0.1:8265").rstrip("/")


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
    """Submission driver log only. `submission_id` must be that job's submission id."""
    url = f"{ray_dashboard_base_url()}/api/jobs/{submission_id}/logs"
    response = await client.get(url, timeout=60.0)
    response.raise_for_status()
    body = response.json()
    if isinstance(body, dict) and isinstance(body.get("logs"), str):
        return body["logs"]
    if isinstance(body, str):
        return body
    return ""


async def fetch_state_log_file(
    client: httpx.AsyncClient,
    *,
    submission_id: str | None = None,
    pid: int | None = None,
    node_id: str | None = None,
    lines: int = 2000,
) -> str:
    """One log file from Ray's state API. Requires a submission id or a driver pid+node."""
    params: dict[str, str | int] = {"lines": lines}
    if submission_id:
        params["submission_id"] = submission_id
    elif pid is not None and node_id:
        params["pid"] = pid
        params["node_id"] = node_id
    else:
        raise ValueError(
            "Refusing cluster-wide logs. Pass a submission id, or a driver pid and node id."
        )
    url = f"{ray_dashboard_base_url()}/api/v0/logs/file"
    response = await client.get(url, params=params, timeout=60.0)
    response.raise_for_status()
    return response.text


def _ray_jobs_fetch_limit() -> int:
    return int(os.environ.get("RAYWATCH_RAY_JOBS_FETCH_LIMIT", "500"))


async def fetch_job_detail_json(client: httpx.AsyncClient, submission_id: str) -> dict[str, Any]:
    url = f"{ray_dashboard_base_url()}/api/jobs/{submission_id}"
    response = await client.get(url, timeout=30.0)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray job detail response must be a JSON object")
    return body


async def enrich_jobs_payload_with_details(
    client: httpx.AsyncClient,
    payload: dict[str, Any],
    *,
    concurrency: int = 16,
) -> dict[str, Any]:
    """Merge per-job detail (start_time, end_time) when the list API omits them."""
    rows = _job_rows_from_payload(payload)
    if not rows:
        return payload

    sem = asyncio.Semaphore(max(1, concurrency))

    async def enrich_row(job_id: str, row: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        if row.get("start_time") is not None or row.get("startTime") is not None:
            return job_id, row
        async with sem:
            try:
                detail = await fetch_job_detail_json(client, job_id)
            except httpx.HTTPError:
                return job_id, row
        merged = {**row, **{k: v for k, v in detail.items() if v is not None}}
        return job_id, merged

    enriched_map = {jid: row for jid, row in rows}
    max_enrich = int(os.environ.get("RAYWATCH_JOB_ENRICH_MAX", "64"))
    need_enrich = [
        (jid, row)
        for jid, row in rows
        if row.get("start_time") is None and row.get("startTime") is None
    ][:max_enrich]
    if need_enrich:
        enriched = await asyncio.gather(*(enrich_row(jid, row) for jid, row in need_enrich))
        for jid, row in enriched:
            enriched_map[jid] = row

    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        nested = data["result"].get("result")
        if isinstance(nested, list):
            merged_list: list[Any] = []
            for item in nested:
                if not isinstance(item, dict):
                    merged_list.append(item)
                    continue
                jid = str(item.get("submission_id") or item.get("job_id") or "")
                merged_list.append(enriched_map.get(jid, item))
            data["result"]["result"] = merged_list
            return payload

    if isinstance(data, list):
        merged_list = []
        for item in data:
            if not isinstance(item, dict):
                merged_list.append(item)
                continue
            jid = str(item.get("submission_id") or item.get("job_id") or "")
            merged_list.append(enriched_map.get(jid, item))
        payload = {**payload, "data": merged_list}
        return payload

    if isinstance(data, dict):
        for key in list(data.keys()):
            if key in enriched_map:
                data[key] = enriched_map[key]
        return payload

    return payload


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


def _objects_fetch_limit() -> int:
    return int(os.environ.get("RAYWATCH_RAY_OBJECTS_FETCH_LIMIT", "500"))


async def fetch_cluster_status_json(client: httpx.AsyncClient) -> dict[str, Any]:
    url = f"{ray_dashboard_base_url()}/api/cluster_status"
    response = await client.get(url, timeout=30.0)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray cluster_status response must be a JSON object")
    return body


async def fetch_objects_json(client: httpx.AsyncClient) -> dict[str, Any]:
    url = f"{ray_dashboard_base_url()}/api/v0/objects"
    response = await client.get(
        url,
        params={"limit": _objects_fetch_limit()},
        timeout=60.0,
    )
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray objects response must be a JSON object")
    return body


async def fetch_actors_json(client: httpx.AsyncClient) -> dict[str, Any]:
    url = f"{ray_dashboard_base_url()}/api/v0/actors"
    response = await client.get(url, params={"detail": "1", "limit": 1000}, timeout=60.0)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray actors response must be a JSON object")
    return body


async def request_stop_job(client: httpx.AsyncClient, job_id: str) -> None:
    url = f"{ray_dashboard_base_url()}/api/jobs/{job_id}/stop"
    response = await client.post(url, timeout=30.0)
    response.raise_for_status()


async def request_kill_actor(client: httpx.AsyncClient, actor_id: str) -> None:
    """Ask Ray to kill one actor (dashboard State API)."""
    url = f"{ray_dashboard_base_url()}/api/v0/actors/kill"
    response = await client.post(url, params={"actor_id": actor_id, "max_restarts": 0}, timeout=30.0)
    response.raise_for_status()
