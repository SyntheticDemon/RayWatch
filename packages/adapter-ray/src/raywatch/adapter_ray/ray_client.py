"""HTTP client for Ray dashboard State API."""

from __future__ import annotations

import os
from typing import Any

import httpx


def ray_dashboard_base_url() -> str:
    return os.environ.get("RAY_DASHBOARD_URL", "http://127.0.0.1:8265").rstrip("/")


async def fetch_jobs_json(client: httpx.AsyncClient) -> dict[str, Any]:
    url = f"{ray_dashboard_base_url()}/api/v0/jobs/"
    response = await client.get(url, timeout=30.0)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Ray jobs response must be a JSON object")
    return body


async def request_stop_job(client: httpx.AsyncClient, job_id: str) -> None:
    url = f"{ray_dashboard_base_url()}/api/jobs/{job_id}/stop"
    response = await client.post(url, timeout=30.0)
    response.raise_for_status()
