"""Resolve job logs from fixture files or Ray Jobs API."""

from __future__ import annotations

import httpx
from raywatch.adapter_ray.fixture_logs import load_fixture_job_logs
from raywatch.adapter_ray.ray_client import fetch_job_logs_text, ray_dashboard_base_url
from raywatch.model.job import JobDetail


def _fixture_logs_hint(job_id: str) -> str:
    return (
        f"No fixture log file for job {job_id}. "
        f"Add tests/fixtures/ray/logs/{job_id}.log or set RAYWATCH_FIXTURE_LOGS."
    )


async def fetch_logs_for_job(job: JobDetail, *, cluster_epoch: str) -> str:
    if cluster_epoch == "fixture":
        text = load_fixture_job_logs(job.job_id)
        if text is not None:
            return text
        return f"INFO {_fixture_logs_hint(job_id=job.job_id)}\n"

    submission_id = job.job_id
    async with httpx.AsyncClient() as client:
        try:
            return await fetch_job_logs_text(client, submission_id)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 404:
                raise
            raise ValueError(
                f"Ray has no job '{submission_id}' at {ray_dashboard_base_url()}. "
                "Fixture ids like 01000000 are not real Ray jobs — use `make dev-api` "
                "(fixture logs) or `make demo-ray` + `make dev-api-live` and open a "
                "submission_id from GET /jobs."
            ) from exc
