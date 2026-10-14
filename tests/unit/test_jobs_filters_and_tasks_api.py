import pytest
from httpx import AsyncClient

from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus
from raywatch.model.task import TaskStatus, TaskSummary


@pytest.mark.asyncio
async def test_list_jobs_status_filter(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs?status=RUNNING")
    assert response.status_code == 200
    body = response.json()
    assert all(item["status"] == "RUNNING" for item in body["items"])


@pytest.mark.asyncio
async def test_get_task_and_job_tasks(api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from pathlib import Path

    from raywatch.collector.sync_loop import sync_active_jobs

    jobs = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"
    tasks = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "tasks_list_2_59.json"
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(jobs))
    monkeypatch.setenv("RAYWATCH_FIXTURE_TASKS", str(tasks))
    await sync_active_jobs(live_cache)

    tasks_resp = await api_client.get("/jobs/01000000/tasks")
    assert tasks_resp.status_code == 200
    task_id = tasks_resp.json()["items"][0]["task_id"]
    task_resp = await api_client.get(f"/tasks/{task_id}")
    assert task_resp.status_code == 200
    assert task_resp.json()["task"]["task_id"] == task_id


@pytest.mark.asyncio
async def test_job_logs_endpoint_mocked(api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_logs(_client: object, _job_id: str) -> str:
        return "line1\nline2"

    monkeypatch.setattr("raywatch.api.routes.jobs.fetch_job_logs_text", fake_logs)
    response = await api_client.get("/jobs/01000000/logs")
    assert response.status_code == 200
    assert "line1" in response.json()["logs"]


def test_list_jobs_search_q() -> None:
    live_cache.reset()
    live_cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(
                        job_id="alpha-job",
                        status=JobStatus.RUNNING,
                        entrypoint="python train.py",
                    ),
                ),
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(
                        job_id="beta-job",
                        status=JobStatus.SUCCEEDED,
                        entrypoint="python eval.py",
                    ),
                ),
            ]
        )
    )
    items, _ = live_cache.list_jobs(None, 50, q="train")
    assert len(items) == 1
    assert items[0].job_id == "alpha-job"
