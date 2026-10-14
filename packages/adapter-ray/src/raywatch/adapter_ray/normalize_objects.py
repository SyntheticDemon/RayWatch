"""Map Ray dashboard objects JSON into canonical summaries."""

from __future__ import annotations

from typing import Any

from raywatch.adapter_ray.normalize_cluster import _rows_from_payload
from raywatch.model.cluster import ObjectSummary


def normalize_objects_payload(payload: dict[str, Any]) -> list[ObjectSummary]:
    objects: list[ObjectSummary] = []
    for row in _rows_from_payload(payload):
        object_id = str(row.get("object_id") or row.get("object_ref") or "")
        if not object_id:
            continue
        size = row.get("object_size")
        pid = row.get("pid")
        objects.append(
            ObjectSummary(
                object_id=object_id,
                object_size=int(size) if size is not None else None,
                reference_type=str(row.get("reference_type") or "") or None,
                task_status=str(row.get("task_status") or "") or None,
                owner_type=str(row.get("type") or "") or None,
                pid=int(pid) if pid is not None else None,
                ip=str(row.get("ip") or "") or None,
            )
        )
    return objects
