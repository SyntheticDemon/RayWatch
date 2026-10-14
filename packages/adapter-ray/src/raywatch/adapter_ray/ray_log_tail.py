"""Stream job logs from Ray dashboard WebSocket tail endpoint."""

from __future__ import annotations

from collections.abc import AsyncIterator
from urllib.parse import urlparse

import websockets
from raywatch.adapter_ray.ray_client import ray_dashboard_base_url


def _ray_dashboard_ws_base() -> str:
    parsed = urlparse(ray_dashboard_base_url())
    scheme = "wss" if parsed.scheme == "https" else "ws"
    return f"{scheme}://{parsed.netloc}"


async def stream_ray_job_log_tail(submission_id: str) -> AsyncIterator[str]:
    url = f"{_ray_dashboard_ws_base()}/api/jobs/{submission_id}/logs/tail"
    async with websockets.connect(url, open_timeout=15, close_timeout=5) as ws:
        async for message in ws:
            if isinstance(message, bytes):
                yield message.decode("utf-8", errors="replace")
            else:
                yield message
