"""Map Ray State API job payloads into ingest ops."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus


def _parse_time(value: float | int | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromtimestamp(float(value), tz=UTC)


def _map_status(raw: str | None) -> JobStatus:
    if raw is None:
        return JobStatus.PENDING
    try:
        return JobStatus(raw.upper())
    except ValueError:
        return JobStatus.PENDING


def normalize_jobs_payload(payload: dict[str, Any], cluster_epoch: str = "default") -> IngestBatch:
    """
    Accepts Ray dashboard shape: {"data": {job_id: {...}, ...}} or list under data.
    """
    data = payload.get("data")
    rows: list[tuple[str, dict[str, Any]]] = []
    if isinstance(data, dict):
        rows = [(key, value) for key, value in data.items() if isinstance(value, dict)]
    elif isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            job_id = str(item.get("submission_id") or item.get("job_id") or item.get("id") or "")
            if job_id:
                rows.append((job_id, item))

    ops: list[IngestOp] = []
    for job_id, row in rows:
        status = _map_status(row.get("status"))
        task_stats = row.get("task_stats") or row.get("tasks") or {}
        running = int(task_stats.get("RUNNING") or task_stats.get("running") or 0)
        failed = int(task_stats.get("FAILED") or task_stats.get("failed") or 0)
        total = int(task_stats.get("total") or running + failed)
        job = JobDetail(
            job_id=job_id,
            status=status,
            entrypoint=str(row.get("entrypoint") or row.get("command") or ""),
            started_at=_parse_time(row.get("start_time") or row.get("startTime")),
            ended_at=_parse_time(row.get("end_time") or row.get("endTime")),
            error_message=row.get("error_message") or row.get("message"),
            task_running=running,
            task_failed=failed,
            task_total=total,
            driver_pid=row.get("driver_pid") or row.get("driverPid"),
            metadata={k: str(v) for k, v in (row.get("metadata") or {}).items()},
        )
        ops.append(IngestOp(kind="upsert_job", job=job))

    return IngestBatch(ops=ops, cluster_epoch=cluster_epoch)
