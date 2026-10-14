"""CPU profile, stack trace, and memory profile stay bound to one task."""

import pytest
from httpx import AsyncClient
from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus
from raywatch.model.task import TaskStatus, TaskSummary


def _seed_task(*, node_id: str | None) -> None:
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(job_id="job-1", status=JobStatus.RUNNING),
                ),
                IngestOp(
                    kind="upsert_task",
                    task=TaskSummary(
                        task_id="task-running",
                        job_id="job-1",
                        status=TaskStatus.RUNNING,
                        name="func.train",
                        node_id=node_id,
                        attempt_number=2,
                    ),
                ),
            ]
        )
    )


@pytest.mark.asyncio
async def test_cpu_profile_refuses_task_without_node(api_client: AsyncClient) -> None:
    _seed_task(node_id=None)
    response = await api_client.get("/tasks/task-running/cpu-profile")
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "TASK_NOT_PROFILEABLE"


@pytest.mark.asyncio
async def test_cpu_profile_proxies_only_that_task(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed_task(node_id="node-abc")
    captured: dict[str, object] = {}

    class FakeResponse:
        status_code = 200
        content = b"<svg>flame</svg>"
        headers = {"content-type": "text/html; charset=utf-8"}

    class FakeClient:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "FakeClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

        async def get(self, url: str, params: dict[str, object] | None = None, timeout: float | None = None) -> FakeResponse:
            captured["url"] = url
            captured["params"] = params
            captured["timeout"] = timeout
            return FakeResponse()

    monkeypatch.setattr("raywatch.api.routes.tasks.httpx.AsyncClient", FakeClient)
    response = await api_client.get("/tasks/task-running/cpu-profile")
    assert response.status_code == 200
    assert b"flame" in response.content
    assert str(captured["url"]).endswith("/task/cpu_profile")
    assert captured["params"] == {
        "task_id": "task-running",
        "attempt_number": 2,
        "node_id": "node-abc",
    }


@pytest.mark.asyncio
async def test_job_list_includes_submission_type_and_pid(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs")
    assert response.status_code == 200
    job = next(item for item in response.json()["items"] if item["job_id"] == "01000000")
    assert job["submission_id"] == "01000000"
    assert "entrypoint" in job
    assert "driver_pid" in job
