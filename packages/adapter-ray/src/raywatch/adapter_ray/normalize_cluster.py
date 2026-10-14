"""Map Ray dashboard nodes/actors JSON into canonical summaries."""

from __future__ import annotations

from typing import Any

from raywatch.model.cluster import ActorSummary, NodeSummary


def _gpu_total_from_resources(resources: dict[str, Any]) -> float | None:
    total = 0.0
    found = False
    for key, value in resources.items():
        if key != "GPU" and not str(key).startswith("GPU"):
            continue
        try:
            total += float(value)
            found = True
        except (TypeError, ValueError):
            continue
    return total if found else None


def _rows_from_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        nested = data["result"].get("result")
        if isinstance(nested, list):
            return [row for row in nested if isinstance(row, dict)]
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    if isinstance(data, dict):
        return [value for value in data.values() if isinstance(value, dict)]
    return []


def normalize_nodes_payload(payload: dict[str, Any]) -> list[NodeSummary]:
    nodes: list[NodeSummary] = []
    for row in _rows_from_payload(payload):
        node_id = str(row.get("node_id") or row.get("NodeID") or row.get("id") or "")
        if not node_id:
            continue
        resources = row.get("resources_total") or {}
        cpu = resources.get("CPU") if isinstance(resources, dict) else None
        memory = resources.get("memory") if isinstance(resources, dict) else None
        object_store = resources.get("object_store_memory") if isinstance(resources, dict) else None
        gpu = _gpu_total_from_resources(resources) if isinstance(resources, dict) else None
        nodes.append(
            NodeSummary(
                node_id=node_id,
                hostname=str(row.get("node_name") or row.get("hostname") or "") or None,
                state=str(row.get("state") or row.get("State") or "") or None,
                is_head=bool(row.get("is_head_node") or row.get("is_head")),
                cpu_total=float(cpu) if cpu is not None else None,
                gpu_total=gpu,
                memory_bytes_total=float(memory) if memory is not None else None,
                object_store_bytes_total=float(object_store) if object_store is not None else None,
            )
        )
    return nodes


def normalize_actors_payload(payload: dict[str, Any]) -> list[ActorSummary]:
    actors: list[ActorSummary] = []
    for row in _rows_from_payload(payload):
        actor_id = str(row.get("actor_id") or row.get("ActorID") or row.get("id") or "")
        if not actor_id:
            continue
        actors.append(
            ActorSummary(
                actor_id=actor_id,
                class_name=str(row.get("class_name") or row.get("name") or "") or None,
                state=str(row.get("state") or row.get("State") or "") or None,
                job_id=str(row.get("job_id") or "") or None,
                worker_id=str(row.get("worker_id") or "") or None,
                node_id=str(row.get("node_id") or "") or None,
            )
        )
    return actors
