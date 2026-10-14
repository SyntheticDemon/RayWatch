from pathlib import Path

import pytest

from raywatch.adapter_ray.fixture_logs import load_fixture_job_logs
from raywatch.adapter_ray.job_logs import fetch_logs_for_job
from raywatch.model.job import JobDetail, JobStatus

FIXTURE_JOBS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"


@pytest.mark.asyncio
async def test_fixture_logs_from_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    text = load_fixture_job_logs("01000000")
    assert text is not None
    assert "train.py" in text


@pytest.mark.asyncio
async def test_fetch_logs_for_fixture_job(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    job = JobDetail(job_id="01000000", status=JobStatus.RUNNING, entrypoint="x")
    logs = await fetch_logs_for_job(job, cluster_epoch="fixture")
    assert "raywatch-fixture" in logs
