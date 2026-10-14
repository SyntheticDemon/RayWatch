from fastapi import APIRouter, HTTPException

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
