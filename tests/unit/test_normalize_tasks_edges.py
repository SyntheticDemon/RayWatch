from raywatch.adapter_ray.normalize_tasks import normalize_tasks_payload


def test_normalize_tasks_skips_rows_without_task_id() -> None:
    payload = {"data": {"result": {"result": [{"job_id": "1", "state": "RUNNING"}]}}}
    batch = normalize_tasks_payload(payload, {})
    assert batch.ops == []


def test_normalize_tasks_finished_state_mapping() -> None:
    payload = {
        "data": {
            "result": {
                "result": [
                    {"task_id": "t1", "job_id": "j1", "state": "FINISHED", "name": "n"},
                ]
            }
        }
    }
    batch = normalize_tasks_payload(payload, {"j1": "sub1"})
    assert batch.ops[0].task is not None
    assert batch.ops[0].task.status.value == "FINISHED"
