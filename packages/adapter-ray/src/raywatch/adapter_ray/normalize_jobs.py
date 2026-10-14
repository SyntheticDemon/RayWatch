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


def _job_rows_from_payload(payload: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    data = payload.get("data")
    rows: list[tuple[str, dict[str, Any]]] = []

    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        nested = data["result"].get("result")
        if isinstance(nested, list):
            data = nested

    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, dict) and key not in {"result", "total"}:
                rows.append((str(key), value))
    elif isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            job_id = str(item.get("submission_id") or item.get("job_id") or item.get("id") or "")
            if job_id:
                rows.append((job_id, item))
    return rows


def normalize_jobs_payload(payload: dict[str, Any], cluster_epoch: str = "default") -> IngestBatch:
    """Ray dashboard jobs JSON (legacy map or 2.59+ paginated list)."""
    rows = _job_rows_from_payload(payload)

    ops: list[IngestOp] = []
    for job_id, row in rows:
        status = _map_status(row.get("status"))
        raw_stats = row.get("task_stats") or row.get("tasks") or {}
        task_stats = raw_stats if isinstance(raw_stats, dict) else {}
        running = int(task_stats.get("RUNNING") or task_stats.get("running") or 0)
        failed = int(task_stats.get("FAILED") or task_stats.get("failed") or 0)
        total = int(task_stats.get("total") or running + failed)
        metadata = {k: str(v) for k, v in (row.get("metadata") or {}).items()}
        ray_internal = row.get("job_id")
        raw_driver = row.get("driver_info")
        driver_info: dict[str, Any] = raw_driver if isinstance(raw_driver, dict) else {}
        if driver_info.get("id"):
            ray_internal = driver_info.get("id")
        if ray_internal:
            metadata["ray_internal_job_id"] = str(ray_internal)
        else:
            metadata.setdefault("ray_internal_job_id", job_id)
        driver_pid = row.get("driver_pid") or row.get("driverPid")
        if driver_info.get("pid") is not None:
            driver_pid = driver_info.get("pid")
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
            driver_pid=int(driver_pid) if driver_pid is not None else None,
            metadata=metadata,
        )
        ops.append(IngestOp(kind="upsert_job", job=job))

    return IngestBatch(ops=ops, cluster_epoch=cluster_epoch)
