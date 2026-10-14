from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class TaskStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"


class TaskSummary(BaseModel):
    task_id: str
    job_id: str
    name: str = ""
    status: TaskStatus
    func_or_class: str = ""
    worker_id: str | None = None
    actor_id: str | None = None
    parent_task_id: str | None = None
    attempt_count: int = 1
    attempt_number: int = 0
    node_id: str | None = None
    worker_pid: int | None = None
    task_type: str = ""
    error_message: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
