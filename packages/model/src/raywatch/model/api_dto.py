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


class TaskResponse(BaseModel):
    task: TaskSummary
    sync: SyncMeta


class JobLogsResponse(BaseModel):
    job_id: str
    logs: str = ""
    error_message: str | None = None
    """Character offset of `logs` within the full job log body."""
    content_offset: int = 0
    """Total character length of the full job log on the server."""
    content_length: int = 0
    sync: SyncMeta


class FreshnessResponse(BaseModel):
    sync: SyncMeta
    job_count: int = 0
    task_count: int = 0


class SyncTriggerResponse(BaseModel):
    accepted: bool
    message: str
    sync: SyncMeta
    job_count: int = 0
    task_count: int = 0


class SearchHit(BaseModel):
    kind: str
    id: str
    job_id: str | None = None
    label: str
    status: str | None = None


class SearchResponse(BaseModel):
    items: list[SearchHit]
    sync: SyncMeta
