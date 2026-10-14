"""Short-lived cache for Ray job log bodies (avoids re-downloading on tail polls)."""

from __future__ import annotations

import os
import time
from typing import Final

_CACHE: dict[tuple[str, str], tuple[float, str]] = {}
_DEFAULT_TTL_SEC: Final[float] = 2.0


def log_fetch_ttl_sec() -> float:
    raw = os.environ.get("RAYWATCH_LOG_FETCH_CACHE_TTL_SEC", "")
    if raw:
        return max(0.0, float(raw))
    return _DEFAULT_TTL_SEC


def get_cached_log(cluster_epoch: str, job_id: str) -> str | None:
    ttl = log_fetch_ttl_sec()
    if ttl <= 0:
        return None
    entry = _CACHE.get((cluster_epoch, job_id))
    if entry is None:
        return None
    fetched_at, text = entry
    if time.monotonic() - fetched_at > ttl:
        _CACHE.pop((cluster_epoch, job_id), None)
        return None
    return text


def put_cached_log(cluster_epoch: str, job_id: str, text: str) -> None:
    if log_fetch_ttl_sec() <= 0:
        return
    _CACHE[(cluster_epoch, job_id)] = (time.monotonic(), text)


def clear_log_cache() -> None:
    _CACHE.clear()
