"""Cluster overview must not sum dead-node capacity into totals."""

from raywatch.api.state import live_cache
from raywatch.model.cluster import NodeSummary, ResourceUtilization
from raywatch.model.ingest import IngestBatch, IngestOp


def test_cluster_overview_sums_alive_nodes_only() -> None:
    live_cache.reset()
    live_cache.set_cluster_snapshot(
        [
            NodeSummary(
                node_id="alive-1",
                state="ALIVE",
                memory_bytes_total=8 * 1024**3,
                cpu_total=4.0,
            ),
            NodeSummary(
                node_id="dead-1",
                state="DEAD",
                memory_bytes_total=4000 * 1024**3,
                cpu_total=1000.0,
            ),
        ],
        [],
        [],
        None,
    )
    overview = live_cache.cluster_overview()
    assert overview.nodes_total == 2
    assert overview.nodes_alive == 1
    assert overview.memory_bytes_total == 8 * 1024**3
    assert overview.cpu_total == 4.0


def test_cluster_overview_prefers_autoscaler_memory_total() -> None:
    live_cache.reset()
    live_cache.set_cluster_snapshot(
        [
            NodeSummary(node_id="alive-1", state="ALIVE", memory_bytes_total=100.0),
        ],
        [],
        [],
        ResourceUtilization(
            cpu_used=1.0,
            cpu_total=20.0,
            memory_bytes_used=2 * 1024**3,
            memory_bytes_total=10.29 * 1024**3,
            object_store_bytes_used=0.0,
            object_store_bytes_total=4.41 * 1024**3,
        ),
    )
    overview = live_cache.cluster_overview()
    assert overview.cpu_total == 20.0
    assert abs(overview.memory_bytes_total - 10.29 * 1024**3) < 1024
