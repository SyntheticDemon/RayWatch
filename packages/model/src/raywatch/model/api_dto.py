from pydantic import BaseModel
from raywatch.model.freshness import SyncMeta
from raywatch.model.job import JobDetail, JobSummary
from raywatch.model.task import TaskSummary


class JobsPage(BaseModel):
    items: list[JobSummary]
    next_cursor: str | None = None
    sync: SyncMeta


class JobResponse(BaseModel):
    job: JobDetail
    sync: SyncMeta


class TasksPage(BaseModel):
    items: list[TaskSummary]
    next_cursor: str | None = None
    sync: SyncMeta


class StopJobResponse(BaseModel):
    job_id: str
    accepted: bool
    message: str
    sync: SyncMeta


class FreshnessResponse(BaseModel):
    sync: SyncMeta
    job_count: int = 0
    task_count: int = 0
