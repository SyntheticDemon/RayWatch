from raywatch.engine.live_cache import LiveCache
from raywatch.model.cluster import ResourceUtilization


def test_utilization_history_keeps_last_48_samples() -> None:
    cache = LiveCache()
    util = ResourceUtilization(
        cpu_used=1.0,
        cpu_total=10.0,
        memory_bytes_used=1e9,
        memory_bytes_total=10e9,
        object_store_bytes_used=0.0,
        object_store_bytes_total=1e9,
    )
    for cpu in range(50):
        cache.set_cluster_snapshot([], [], [], util.model_copy(update={"cpu_used": float(cpu)}))
    history = cache.utilization_history()
    assert len(history) == 48
    assert history[-1].cpu_used == 49.0
