"""Job logs stay on one job and never fall back to a cluster-wide fetch."""

import pytest
from raywatch.adapter_ray.job_logs import fetch_logs_for_job
from raywatch.adapter_ray.log_fetch_cache import clear_log_cache
from raywatch.model.job import JobDetail, JobStatus


@pytest.fixture(autouse=True)
def _clear_log_cache() -> None:
    clear_log_cache()


@pytest.mark.asyncio
async def test_driver_job_without_pid_does_not_fetch_logs(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fail_fetch(*_args: object, **_kwargs: object) -> str:
        raise AssertionError("unscoped log fetch")

    monkeypatch.setattr("raywatch.adapter_ray.job_logs.fetch_state_log_file", fail_fetch)
    monkeypatch.setattr("raywatch.adapter_ray.job_logs.fetch_job_logs_text", fail_fetch)
    job = JobDetail(
        job_id="01000000",
        status=JobStatus.RUNNING,
        metadata={"job_type": "DRIVER", "ray_internal_job_id": "01000000"},
    )
    with pytest.raises(ValueError, match="cluster-wide"):
        await fetch_logs_for_job(job, cluster_epoch="live")


@pytest.mark.asyncio
async def test_submission_log_uses_that_submission_id(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[dict[str, object]] = []

    async def fake_state(_client: object, **kwargs: object) -> str:
        seen.append(kwargs)
        return "driver log for raysubmit_abc\n"

    monkeypatch.setattr("raywatch.adapter_ray.job_logs.fetch_state_log_file", fake_state)
    job = JobDetail(
        job_id="raysubmit_abc",
        status=JobStatus.RUNNING,
        metadata={"submission_id": "raysubmit_abc"},
    )
    text = await fetch_logs_for_job(job, cluster_epoch="live")
    assert text.startswith("driver log for raysubmit_abc")
    assert seen == [{"submission_id": "raysubmit_abc"}]


@pytest.mark.asyncio
async def test_driver_log_uses_pid_and_node_only(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[dict[str, object]] = []

    async def fake_state(_client: object, **kwargs: object) -> str:
        seen.append(kwargs)
        return "pid log\n"

    monkeypatch.setattr("raywatch.adapter_ray.job_logs.fetch_state_log_file", fake_state)
    job = JobDetail(
        job_id="01000000",
        status=JobStatus.RUNNING,
        driver_pid=4242,
        metadata={
            "job_type": "DRIVER",
            "ray_internal_job_id": "01000000",
            "driver_node_id": "node-a",
        },
    )
    text = await fetch_logs_for_job(job, cluster_epoch="live")
    assert text == "pid log\n"
    assert seen == [{"pid": 4242, "node_id": "node-a"}]
