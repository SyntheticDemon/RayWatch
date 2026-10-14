"""Which single Ray log file belongs to a job."""

from __future__ import annotations

from dataclasses import dataclass

from raywatch.model.job import JobDetail


@dataclass(frozen=True)
class JobLogScope:
    submission_id: str | None
    driver_pid: int | None
    driver_node_id: str | None


def log_scope_for_job(job: JobDetail) -> JobLogScope:
    """Submission driver file, else that driver's process file. Never the whole cluster."""
    submission = (job.metadata.get("submission_id") or "").strip() or None
    job_type = (job.metadata.get("job_type") or "").upper()
    internal = (job.metadata.get("ray_internal_job_id") or "").strip()
    if submission is None and job_type == "SUBMISSION":
        submission = job.job_id
    elif submission is None and job.job_id.startswith("raysubmit_"):
        submission = job.job_id
    elif submission is None and job_type != "DRIVER" and internal != job.job_id:
        submission = job.job_id

    node = (job.metadata.get("driver_node_id") or "").strip() or None
    return JobLogScope(
        submission_id=submission,
        driver_pid=job.driver_pid,
        driver_node_id=node,
    )
