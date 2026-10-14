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


def test_normalize_tasks_2_59_fixture_attempt_and_error() -> None:
    import json
    from pathlib import Path

    from raywatch.adapter_ray.normalize_tasks import (
        normalize_tasks_payload,
        task_total_from_payload,
    )

    fixture = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "tasks_list_2_59.json"
    payload = json.loads(fixture.read_text(encoding="utf-8"))
    assert task_total_from_payload(payload) == 4
    batch = normalize_tasks_payload(
        payload,
        {"01000000": "01000000", "ray_driver_nested_demo": "ray_driver_nested_demo"},
    )
    assert len(batch.ops) == 4
    running = batch.ops[0].task
    failed = batch.ops[1].task
    assert running is not None and failed is not None
    assert running.attempt_count == 1
    assert failed.attempt_count == 2
    assert failed.error_message == "WorkerCrashed"
    assert running.started_at is not None
    assert running.ended_at is not None
    assert failed.started_at is not None


def test_normalize_tasks_maps_start_time_ms() -> None:
    payload = {
        "data": {
            "result": {
                "result": [
                    {
                        "task_id": "t1",
                        "job_id": "j1",
                        "state": "RUNNING",
                        "start_time_ms": 1710000000000,
                    }
                ]
            }
        }
    }
    batch = normalize_tasks_payload(payload, {})
    task = batch.ops[0].task
    assert task is not None
    assert task.started_at is not None
    assert task.started_at.year == 2024
