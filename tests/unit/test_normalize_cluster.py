from raywatch.adapter_ray.normalize_cluster import normalize_actors_payload, normalize_nodes_payload


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


def test_normalize_actors_keeps_ray_table_fields() -> None:
    actors = normalize_actors_payload(
        {
            "data": {
                "result": {
                    "result": [
                        {
                            "actor_id": "a1",
                            "class_name": "Counter",
                            "name": "counter-a",
                            "state": "ALIVE",
                            "job_id": "01000000",
                            "node_id": "node-abc",
                            "pid": 42,
                            "ray_namespace": "serve",
                            "num_restarts": 3,
                            "placement_group_id": "pg-1",
                        }
                    ]
                }
            }
        }
    )
    assert len(actors) == 1
    actor = actors[0]
    assert actor.class_name == "Counter"
    assert actor.name == "counter-a"
    assert actor.pid == 42
    assert actor.ray_namespace == "serve"
    assert actor.num_restarts == 3
    assert actor.placement_group_id == "pg-1"
    assert actor.node_id == "node-abc"
