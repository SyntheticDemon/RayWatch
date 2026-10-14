from raywatch.adapter_ray.normalize_tasks import normalize_tasks_payload


def test_normalize_tasks_maps_ray_job_id_to_submission() -> None:
    payload = {
        "data": {
            "result": {
                "result": [
                    {
                        "task_id": "t1",
                        "state": "RUNNING",
                        "job_id": "02000000",
                        "name": "f",
                    }
                ]
            }
        }
    }
    batch = normalize_tasks_payload(payload, {"02000000": "raysubmit_abc"})
    assert len(batch.ops) == 1
    assert batch.ops[0].task is not None
    assert batch.ops[0].task.job_id == "raysubmit_abc"
    assert batch.ops[0].task.task_id == "t1"
