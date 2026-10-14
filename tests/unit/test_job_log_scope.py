import httpx
import pytest
from raywatch.adapter_ray.job_log_scope import log_scope_for_job
from raywatch.adapter_ray.ray_client import fetch_state_log_file
from raywatch.model.job import JobDetail, JobStatus


def _job(**kwargs: object) -> JobDetail:
    status = kwargs.pop("status", JobStatus.RUNNING)
    return JobDetail(status=status, **kwargs)  # type: ignore[arg-type]


def test_submission_id_is_used_instead_of_internal_hex() -> None:
    scope = log_scope_for_job(
        _job(
            job_id="raysubmit_abc",
            metadata={"submission_id": "raysubmit_abc", "ray_internal_job_id": "01000000"},
        )
    )
    assert scope.submission_id == "raysubmit_abc"


def test_driver_job_does_not_become_a_cluster_log() -> None:
    scope = log_scope_for_job(
        _job(
            job_id="01000000",
            driver_pid=4242,
            metadata={
                "job_type": "DRIVER",
                "ray_internal_job_id": "01000000",
                "driver_node_id": "node-a",
            },
        )
    )
    assert scope.submission_id is None
    assert scope.driver_pid == 4242
    assert scope.driver_node_id == "node-a"


@pytest.mark.asyncio
async def test_state_log_file_requires_a_job_filter(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://ray.test:8265")

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v0/logs/file"
        assert request.url.params["submission_id"] == "raysubmit_abc"
        assert "pid" not in request.url.params
        return httpx.Response(200, text="only this job\n")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        text = await fetch_state_log_file(client, submission_id="raysubmit_abc")
    assert text == "only this job\n"


@pytest.mark.asyncio
async def test_state_log_file_refuses_unfiltered_request() -> None:
    async with httpx.AsyncClient() as client:
        with pytest.raises(ValueError, match="cluster-wide"):
            await fetch_state_log_file(client)
