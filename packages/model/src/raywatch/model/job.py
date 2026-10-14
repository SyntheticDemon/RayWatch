from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class JobStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    STOPPED = "STOPPED"


class JobSummary(BaseModel):
    job_id: str
    status: JobStatus
    entrypoint: str = ""
    started_at: datetime | None = None
    ended_at: datetime | None = None
    error_message: str | None = None
    task_running: int = 0
    task_failed: int = 0
    task_total: int = 0


class JobDetail(JobSummary):
    driver_pid: int | None = None
    metadata: dict[str, str] = Field(default_factory=dict)
