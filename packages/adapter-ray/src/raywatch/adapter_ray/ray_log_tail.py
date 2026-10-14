"""Stream one job's log file from Ray. Never opens an unfiltered cluster log."""

from __future__ import annotations

from collections.abc import AsyncIterator
from urllib.parse import urlencode, urlparse

import websockets
from raywatch.adapter_ray.ray_client import ray_dashboard_base_url
from raywatch.model.job import JobDetail

from raywatch.adapter_ray.job_log_scope import log_scope_for_job


def _ray_dashboard_ws_base() -> str:
    parsed = urlparse(ray_dashboard_base_url())
    scheme = "wss" if parsed.scheme == "https" else "ws"
    return f"{scheme}://{parsed.netloc}"


async def stream_ray_job_log_tail(job: JobDetail) -> AsyncIterator[str]:
    scope = log_scope_for_job(job)
    params: dict[str, str | int] = {"lines": 200}
    if scope.submission_id:
        params["submission_id"] = scope.submission_id
    elif scope.driver_pid is not None and scope.driver_node_id:
        params["pid"] = scope.driver_pid
        params["node_id"] = scope.driver_node_id
    else:
        yield (
            "\n[raywatch] No job-scoped log. This job has no submission id "
            "and no driver pid/node, so cluster-wide logs are not shown.\n"
        )
        return
    url = f"{_ray_dashboard_ws_base()}/api/v0/logs/stream?{urlencode(params)}"
    async with websockets.connect(url, open_timeout=15, close_timeout=5) as ws:
        async for message in ws:
            if isinstance(message, bytes):
                yield message.decode("utf-8", errors="replace")
            else:
                yield message
