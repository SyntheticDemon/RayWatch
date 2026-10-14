from pathlib import Path

from raywatch.adapter_ray.fixture_loader import load_json_fixture
from raywatch.adapter_ray.normalize_jobs import normalize_jobs_payload

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"


def test_normalize_jobs_fixture_produces_three_jobs() -> None:
    payload = load_json_fixture(FIXTURE)
    batch = normalize_jobs_payload(payload)
    assert len(batch.ops) == 3
    first = batch.ops[0].job
    assert first is not None
    assert first.job_id == "01000000"
    assert first.status.value == "RUNNING"
    assert first.task_running == 4
    assert first.submission_id == "01000000"
