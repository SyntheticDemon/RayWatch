"""Map Ray dashboard tasks JSON into ingest ops."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.task import TaskStatus, TaskSummary


def task_total_from_payload(payload: dict[str, Any]) -> int | None:
    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        total = data["result"].get("total")
        if isinstance(total, int):
            return total
        if isinstance(total, str) and total.isdigit():
            return int(total)
    return None


def _task_rows_from_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        nested = data["result"].get("result")
        if isinstance(nested, list):
            return [row for row in nested if isinstance(row, dict)]
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    return []


def _attempt_count(row: dict[str, Any]) -> int:
    if "attempt_number" in row and row["attempt_number"] is not None:
        return max(1, int(row["attempt_number"]) + 1)
    return max(1, int(row.get("attempt_count") or 1))


def _task_error_message(row: dict[str, Any]) -> str | None:
    parts = [str(row.get("error_type") or ""), str(row.get("error_message") or "")]
    text = ": ".join(p for p in parts if p).strip(": ")
    return text or None


def _parse_task_time(value: float | int | str | None) -> datetime | None:
    if value is None or value == "":
        return None
    ts = float(value)
    if ts > 1e14:
        ts /= 1e9
    elif ts > 1e12:
        ts /= 1e3
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _task_started_at(row: dict[str, Any]) -> datetime | None:
    for key in ("start_time_ms", "start_time", "creation_time_ms", "creation_time"):
        parsed = _parse_task_time(row.get(key))
        if parsed is not None:
            return parsed
    return None


def _task_ended_at(row: dict[str, Any]) -> datetime | None:
    for key in ("end_time_ms", "end_time", "finish_time_ms"):
        parsed = _parse_task_time(row.get(key))
        if parsed is not None:
            return parsed
    return None


def _map_task_status(raw: str | None) -> TaskStatus:
    if raw is None:
        return TaskStatus.PENDING
    upper = raw.upper()
    if upper in ("FINISHED", "SUCCEEDED", "COMPLETED"):
        return TaskStatus.FINISHED
    if upper == "FAILED":
        return TaskStatus.FAILED
    if upper == "RUNNING":
        return TaskStatus.RUNNING
    return TaskStatus.PENDING


def normalize_tasks_payload(
    payload: dict[str, Any],
    ray_job_id_to_submission: dict[str, str],
    cluster_epoch: str = "default",
) -> IngestBatch:
    ops: list[IngestOp] = []
    for row in _task_rows_from_payload(payload):
        task_id = str(row.get("task_id") or "")
        if not task_id:
            continue
        ray_job_id = str(row.get("job_id") or "")
        job_id = ray_job_id_to_submission.get(ray_job_id, ray_job_id)
        task = TaskSummary(
            task_id=task_id,
            job_id=job_id,
            name=str(row.get("name") or ""),
            status=_map_task_status(row.get("state") or row.get("status")),
            func_or_class=str(row.get("func_or_class_name") or row.get("func_or_class") or ""),
            worker_id=str(row.get("worker_id") or "") or None,
            actor_id=str(row.get("actor_id") or "") if row.get("actor_id") else None,
            parent_task_id=str(row.get("parent_task_id") or "") or None,
            attempt_count=_attempt_count(row),
            attempt_number=int(row.get("attempt_number") or 0),
            node_id=str(row.get("node_id") or "") or None,
            worker_pid=int(row["worker_pid"]) if row.get("worker_pid") not in (None, "") else None,
            task_type=str(row.get("type") or ""),
            error_message=_task_error_message(row),
            started_at=_task_started_at(row),
            ended_at=_task_ended_at(row),
        )
        ops.append(IngestOp(kind="upsert_task", task=task))
    return IngestBatch(ops=ops, cluster_epoch=cluster_epoch)
