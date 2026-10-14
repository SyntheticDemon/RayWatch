from raywatch.adapter_ray.normalize_objects import normalize_objects_payload


def test_normalize_objects_payload() -> None:
    payload = {
        "data": {
            "result": {
                "result": [
                    {
                        "object_id": "abc123",
                        "object_size": 64,
                        "reference_type": "PINNED_IN_MEMORY",
                        "task_status": "RUNNING",
                        "type": "DRIVER",
                        "pid": 1,
                        "ip": "127.0.0.1",
                    }
                ]
            }
        }
    }
    items = normalize_objects_payload(payload)
    assert len(items) == 1
    assert items[0].object_id == "abc123"
    assert items[0].object_size == 64
    assert items[0].reference_type == "PINNED_IN_MEMORY"
