"""Sample job logs for fixture dev (no Ray head required)."""

from __future__ import annotations

import os
from pathlib import Path


def fixture_logs_dir() -> Path | None:
    raw = os.environ.get("RAYWATCH_FIXTURE_LOGS")
    if raw:
        path = Path(raw)
        return path if path.is_dir() else None
    # Default next to jobs fixture tree
    jobs = os.environ.get("RAYWATCH_FIXTURE_JOBS")
    if jobs:
        return Path(jobs).resolve().parent / "logs"
    return None


def load_fixture_job_logs(job_id: str) -> str | None:
    directory = fixture_logs_dir()
    if directory is None or not directory.is_dir():
        return None
    for name in (f"{job_id}.log", f"{job_id}.txt"):
        path = directory / name
        if path.is_file():
            return path.read_text(encoding="utf-8")
    return None
