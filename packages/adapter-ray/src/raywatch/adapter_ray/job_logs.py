"""Resolve job logs from fixture files or Ray Jobs API."""

from __future__ import annotations

import httpx
from raywatch.adapter_ray.fixture_logs import load_fixture_job_logs
from raywatch.adapter_ray.log_fetch_cache import get_cached_log, put_cached_log
from raywatch.adapter_ray.job_log_scope import log_scope_for_job
from raywatch.adapter_ray.ray_client import fetch_job_logs_text, fetch_state_log_file, ray_dashboard_base_url
from raywatch.model.job import JobDetail


def _fixture_logs_hint(job_id: str) -> str:
    return (
        f"No fixture log file for job {job_id}. "
        f"Add tests/fixtures/ray/logs/{job_id}.log or set RAYWATCH_FIXTURE_LOGS."
    )


async def fetch_logs_for_job(job: JobDetail, *, cluster_epoch: str) -> str:
    cached = get_cached_log(cluster_epoch, job.job_id)
    if cached is not None:
        return cached

    if cluster_epoch == "fixture":
        text = load_fixture_job_logs(job.job_id)
        if text is not None:
            put_cached_log(cluster_epoch, job.job_id, text)
            return text
        hint = f"INFO {_fixture_logs_hint(job_id=job.job_id)}\n"
        put_cached_log(cluster_epoch, job.job_id, hint)
        return hint

    scope = log_scope_for_job(job)
    if scope.submission_id is None and (scope.driver_pid is None or not scope.driver_node_id):
        raise ValueError(
            f"No job-scoped log for '{job.job_id}'. "
            "RayWatch will not load cluster-wide logs. "
            "Submission jobs need a submission id; driver jobs need a driver pid and node id."
        )
    async with httpx.AsyncClient() as client:
        try:
            if scope.submission_id:
                try:
                    text = await fetch_state_log_file(
                        client, submission_id=scope.submission_id
                    )
                except httpx.HTTPStatusError:
                    text = await fetch_job_logs_text(client, scope.submission_id)
            else:
                text = await fetch_state_log_file(
                    client,
                    pid=scope.driver_pid,
                    node_id=scope.driver_node_id,
                )
            put_cached_log(cluster_epoch, job.job_id, text)
            return text
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:400]
            raise ValueError(
                f"Ray refused logs for job '{job.job_id}' at {ray_dashboard_base_url()} "
                f"({exc.response.status_code}). {detail}"
            ) from exc
