from raywatch.adapter_ray.normalize_cluster import normalize_nodes_payload


def test_normalize_nodes_extracts_resource_totals() -> None:
    payload = {
        "data": {
            "result": {
                "result": [
                    {
                        "node_id": "n1",
                        "state": "ALIVE",
                        "resources_total": {
                            "CPU": 8.0,
                            "GPU": 2.0,
                            "memory": 16e9,
                            "object_store_memory": 4e9,
                        },
                    }
                ]
            }
        }
    }
    nodes = normalize_nodes_payload(payload)
    assert len(nodes) == 1
    assert nodes[0].cpu_total == 8.0
    assert nodes[0].memory_bytes_total == 16e9
    assert nodes[0].object_store_bytes_total == 4e9
    assert nodes[0].gpu_total == 2.0
