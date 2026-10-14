from pathlib import Path

import pytest
from httpx import AsyncClient
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs
from raywatch.engine.job_snapshot_store import JobSnapshotStore
from raywatch.engine.sync_side_effects import job_snapshot_store
from raywatch.model.job import JobDetail, JobStatus

FIXTURE_JOBS = Path(__file__).resolve().parents[1] / "fixtures" / "ray" / "jobs_list.json"


@pytest.mark.asyncio
async def test_list_jobs_include_archived(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    monkeypatch.setenv("RAYWATCH_SNAPSHOT_DIR", str(tmp_path))
    monkeypatch.setattr(
        "raywatch.engine.sync_side_effects._store",
        JobSnapshotStore(None, tmp_path),
    )
    monkeypatch.setenv("RAYWATCH_FIXTURE_JOBS", str(FIXTURE_JOBS))
    await sync_active_jobs(live_cache)
    job_snapshot_store().upsert_jobs(
        [
            JobDetail(
                job_id="only-in-archive",
                status=JobStatus.SUCCEEDED,
                entrypoint="past",
            )
        ]
    )

    live_only = await api_client.get("/jobs")
    assert all(j["job_id"] != "only-in-archive" for j in live_only.json()["items"])

    merged = await api_client.get("/jobs?include_archived=true")
    ids = {j["job_id"] for j in merged.json()["items"]}
    assert "only-in-archive" in ids
