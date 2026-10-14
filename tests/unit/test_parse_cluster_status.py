from raywatch.adapter_ray.parse_cluster_status import parse_resource_utilization


def test_parse_resource_utilization_from_autoscaling_status() -> None:
    payload = {
        "data": {
            "autoscalingStatus": (
                "Cluster status: 1 nodes\n"
                " - ResourceUsage: 2.5/20.0 CPU, 1.0 GiB/10.29 GiB memory, "
                "0.5 GiB/4.41 GiB object_store_memory\n"
            )
        }
    }
    util = parse_resource_utilization(payload)
    assert util is not None
    assert util.cpu_used == 2.5
    assert util.cpu_total == 20.0
    assert util.memory_bytes_used > 0
