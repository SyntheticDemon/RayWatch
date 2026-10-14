"""Map Ray dashboard tasks JSON into ingest ops."""

from __future__ import annotations

from typing import Any

from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.task import TaskStatus, TaskSummary


def _task_rows_from_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        nested = data["result"].get("result")
        if isinstance(nested, list):
            return [row for row in nested if isinstance(row, dict)]
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    return []


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
            attempt_count=int(row.get("attempt_number") or row.get("attempt_count") or 1),
            error_message=str(row.get("error_type") or "") or None,
        )
        ops.append(IngestOp(kind="upsert_task", task=task))
    return IngestBatch(ops=ops, cluster_epoch=cluster_epoch)
