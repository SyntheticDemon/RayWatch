import httpx
from fastapi import APIRouter, HTTPException, Query
from raywatch.adapter_ray.ray_client import request_stop_job
from raywatch.api.state import live_cache
from raywatch.model.api_dto import JobResponse, JobsPage, StopJobResponse, TasksPage

router = APIRouter(prefix="/jobs", tags=["jobs"])

_JOB_NOT_FOUND = HTTPException(
    status_code=404,
    detail={"code": "JOB_NOT_FOUND", "message": "Job not in live_cache"},
)


@router.get("", response_model=JobsPage)
def list_jobs(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
) -> JobsPage:
    items, next_cursor = live_cache.list_jobs(cursor=cursor, limit=limit)
    return JobsPage(items=items, next_cursor=next_cursor, sync=live_cache.sync_meta())


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str) -> JobResponse:
    job = live_cache.get_job(job_id)
    if job is None:
        raise _JOB_NOT_FOUND
    return JobResponse(job=job, sync=live_cache.sync_meta())


@router.get("/{job_id}/tasks", response_model=TasksPage)
def list_job_tasks(
    job_id: str,
    cursor: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> TasksPage:
    if live_cache.get_job(job_id) is None:
        raise _JOB_NOT_FOUND
    items, next_cursor = live_cache.list_tasks_for_job(job_id, cursor=cursor, limit=limit)
    return TasksPage(items=items, next_cursor=next_cursor, sync=live_cache.sync_meta())


@router.post("/{job_id}/stop", response_model=StopJobResponse)
async def stop_job(job_id: str) -> StopJobResponse:
    if live_cache.get_job(job_id) is None:
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
