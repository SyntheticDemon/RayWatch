"""Parse Ray /api/cluster_status autoscaling report for resource utilization."""

from __future__ import annotations

import re
from typing import Any

from raywatch.model.cluster import ResourceUtilization

_RESOURCE_USAGE = re.compile(
    r"ResourceUsage: ([\d.]+)/([\d.]+) CPU, "
    r"([\d.]+) GiB/([\d.]+) GiB memory, "
    r"([\d.]+) GiB/([\d.]+) GiB object_store_memory"
)

_GIB = 1024**3


def parse_resource_utilization(payload: dict[str, Any]) -> ResourceUtilization | None:
    data = payload.get("data")
    if not isinstance(data, dict):
        return None
    text = str(data.get("autoscalingStatus") or "")
    match = _RESOURCE_USAGE.search(text)
    if not match:
        return None
    cpu_used, cpu_total, mem_used_gib, mem_total_gib, os_used_gib, os_total_gib = match.groups()
    return ResourceUtilization(
        cpu_used=float(cpu_used),
        cpu_total=float(cpu_total),
        memory_bytes_used=float(mem_used_gib) * _GIB,
        memory_bytes_total=float(mem_total_gib) * _GIB,
        object_store_bytes_used=float(os_used_gib) * _GIB,
        object_store_bytes_total=float(os_total_gib) * _GIB,
    )
