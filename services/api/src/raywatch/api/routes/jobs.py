from datetime import datetime

import httpx
from fastapi import APIRouter, HTTPException, Query
from raywatch.adapter_ray.job_logs import fetch_logs_for_job
from raywatch.adapter_ray.ray_client import request_stop_job
from raywatch.api.state import live_cache
from raywatch.engine.job_list import list_jobs as list_jobs_merged
from raywatch.engine.sync_side_effects import job_snapshot_store, resolve_job
from raywatch.model.api_dto import (
    JobLogsResponse,
    JobResponse,
    JobsPage,
    StopJobResponse,
    TasksPage,
)
from raywatch.model.job import JobStatus

router = APIRouter(prefix="/jobs", tags=["jobs"])

_JOB_NOT_FOUND = HTTPException(
    status_code=404,
    detail={"code": "JOB_NOT_FOUND", "message": "Job not in live_cache"},
)


@router.get("", response_model=JobsPage)
def list_jobs(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    status: JobStatus | None = None,
    q: str | None = Query(default=None, max_length=200),
    sort: str = Query(default="job_id", pattern="^(job_id|started_at|status)$"),
    started_after: datetime | None = None,
    started_before: datetime | None = None,
    failed_within_hours: float | None = Query(default=None, ge=0.1, le=720),
    include_archived: bool = False,
) -> JobsPage:
    if include_archived:
        items, next_cursor = list_jobs_merged(
            live_cache,
            job_snapshot_store(),
            cursor=cursor,
            limit=limit,
            include_archived=True,
            status=status,
            q=q,
            sort=sort,
            started_after=started_after,
            started_before=started_before,
            failed_within_hours=failed_within_hours,
        )
    else:
        items, next_cursor = live_cache.list_jobs(
            cursor=cursor,
            limit=limit,
            status=status,
            q=q,
            sort=sort,
            started_after=started_after,
            started_before=started_before,
            failed_within_hours=failed_within_hours,
        )
    return JobsPage(items=items, next_cursor=next_cursor, sync=live_cache.sync_meta())


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str) -> JobResponse:
    job = resolve_job(live_cache, job_id)
    if job is None:
        raise _JOB_NOT_FOUND
    return JobResponse(job=job, sync=live_cache.sync_meta())


@router.get("/{job_id}/tasks", response_model=TasksPage)
def list_job_tasks(
    job_id: str,
    cursor: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> TasksPage:
    if resolve_job(live_cache, job_id) is None:
        raise _JOB_NOT_FOUND
    items, next_cursor = live_cache.list_tasks_for_job(job_id, cursor=cursor, limit=limit)
    return TasksPage(items=items, next_cursor=next_cursor, sync=live_cache.sync_meta())


@router.get("/{job_id}/logs", response_model=JobLogsResponse)
async def get_job_logs(job_id: str) -> JobLogsResponse:
    job = resolve_job(live_cache, job_id)
    if job is None:
        raise _JOB_NOT_FOUND
    try:
        sync = live_cache.sync_meta()
        text = await fetch_logs_for_job(job, cluster_epoch=sync.cluster_epoch)
        return JobLogsResponse(job_id=job_id, logs=text, sync=sync)
    except Exception as exc:
        return JobLogsResponse(
            job_id=job_id,
            logs="",
            error_message=str(exc),
            sync=live_cache.sync_meta(),
        )


@router.post("/{job_id}/stop", response_model=StopJobResponse)
async def stop_job(job_id: str) -> StopJobResponse:
    if resolve_job(live_cache, job_id) is None:
        raise _JOB_NOT_FOUND
    try:
        async with httpx.AsyncClient() as client:
            await request_stop_job(client, job_id)
        message = "Stop request sent to Ray"
        accepted = True
    except Exception as exc:
        message = str(exc)
        accepted = False
    return StopJobResponse(
        job_id=job_id,
        accepted=accepted,
        message=message,
        sync=live_cache.sync_meta(),
    )
