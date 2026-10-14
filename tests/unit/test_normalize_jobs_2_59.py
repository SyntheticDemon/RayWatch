from pathlib import Path

from raywatch.adapter_ray.fixture_loader import load_json_fixture
from raywatch.adapter_ray.normalize_jobs import normalize_jobs_payload

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list_2_59.json"


def test_normalize_ray_2_59_list_shape() -> None:
    batch = normalize_jobs_payload(load_json_fixture(FIXTURE))
    assert len(batch.ops) == 1
    job = batch.ops[0].job
    assert job is not None
    assert job.job_id == "raysubmit_test001"
    assert job.status.value == "RUNNING"
