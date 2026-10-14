from typing import Literal

from pydantic import BaseModel
from raywatch.model.job import JobDetail, JobSummary
from raywatch.model.task import TaskSummary


class IngestOp(BaseModel):
    kind: Literal["upsert_job", "upsert_task", "remove_job", "remove_task"]
    job: JobSummary | JobDetail | None = None
    task: TaskSummary | None = None
    job_id: str | None = None
    task_id: str | None = None


class IngestBatch(BaseModel):
    ops: list[IngestOp]
    cluster_epoch: str = "default"
