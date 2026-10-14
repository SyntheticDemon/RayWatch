import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from raywatch.adapter_ray.ray_client import ray_dashboard_base_url
from raywatch.api.state import live_cache
from raywatch.model.api_dto import TaskResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])

_TASK_NOT_FOUND = HTTPException(
    status_code=404,
    detail={"code": "TASK_NOT_FOUND", "message": "Task not in live_cache"},
)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str) -> TaskResponse:
    task = live_cache.get_task(task_id)
    if task is None:
        raise _TASK_NOT_FOUND
    return TaskResponse(task=task, sync=live_cache.sync_meta())


async def _proxy_task_profile(task_id: str, ray_path: str) -> Response:
    """Forward one task's Ray profile. Ray requires task id, attempt, and node."""
    task = live_cache.get_task(task_id)
    if task is None:
        raise _TASK_NOT_FOUND
    if not task.node_id:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "TASK_NOT_PROFILEABLE",
                "message": "Ray CPU profile, stack trace, and memory profile need a node id from a running task.",
            },
        )
    params = {
        "task_id": task.task_id,
        "attempt_number": task.attempt_number,
        "node_id": task.node_id,
    }
    url = f"{ray_dashboard_base_url()}{ray_path}"
    async with httpx.AsyncClient() as client:
        upstream = await client.get(url, params=params, timeout=90.0)
    media = upstream.headers.get("content-type", "text/plain").split(";")[0]
    return Response(content=upstream.content, status_code=upstream.status_code, media_type=media)


@router.get("/{task_id}/cpu-profile")
async def task_cpu_profile(task_id: str) -> Response:
    return await _proxy_task_profile(task_id, "/task/cpu_profile")


@router.get("/{task_id}/traceback")
async def task_traceback(task_id: str) -> Response:
    return await _proxy_task_profile(task_id, "/task/traceback")


@router.get("/{task_id}/memory-profile")
async def task_memory_profile(task_id: str) -> Response:
    return await _proxy_task_profile(task_id, "/memory_profile")
