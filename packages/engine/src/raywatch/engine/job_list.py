"""Jobs list with optional archived rows from snapshot store."""

from __future__ import annotations

import bisect
from datetime import UTC, datetime

from raywatch.engine.job_kind import job_id_matches_kind
from raywatch.engine.job_snapshot_store import JobSnapshotStore
from raywatch.engine.live_cache import LiveCache
from raywatch.model.job import JobStatus, JobSummary


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _job_matches_filters(
    job: JobSummary,
    *,
    status: JobStatus | None,
    q: str | None,
    started_after: datetime | None,
    started_before: datetime | None,
    failed_within_hours: float | None,
    job_kind: str | None = None,
) -> bool:
    if not job_id_matches_kind(job.job_id, job_kind):
        return False
    if status is not None and job.status != status:
        return False
    if started_after is not None and (job.started_at is None or job.started_at < started_after):
        return False
    if started_before is not None and (job.started_at is None or job.started_at > started_before):
        return False
    if failed_within_hours is not None:
        cutoff = _utc_now().timestamp() - failed_within_hours * 3600
        if job.status != JobStatus.FAILED or job.ended_at is None:
            return False
        if job.ended_at.timestamp() < cutoff:
            return False
    if q:
        needle = q.lower().strip()
        missing_in_text = (
            needle and needle not in job.job_id.lower() and needle not in job.entrypoint.lower()
        )
        missing_in_error = job.error_message is None or needle not in job.error_message.lower()
        if missing_in_text and missing_in_error:
            return False
    return True


def _sort_job_ids(
    job_ids: list[str],
    jobs_by_id: dict[str, JobSummary],
    sort: str,
) -> list[str]:
    if sort == "started_at":
        return sorted(
            job_ids,
            key=lambda jid: jobs_by_id[jid].started_at or _utc_now(),
            reverse=True,
        )
    if sort == "status":
        return sorted(job_ids, key=lambda jid: jobs_by_id[jid].status.value)
    return sorted(job_ids)


def list_jobs(
    live_cache: LiveCache,
    snapshot_store: JobSnapshotStore,
    *,
    cursor: str | None,
    limit: int,
    include_archived: bool,
    status: JobStatus | None = None,
    q: str | None = None,
    sort: str = "job_id",
    started_after: datetime | None = None,
    started_before: datetime | None = None,
    failed_within_hours: float | None = None,
    job_kind: str | None = None,
) -> tuple[list[JobSummary], str | None]:
    limit = min(max(limit, 1), 100)
    live_items: list[JobSummary] = []
    page_cursor: str | None = None
    while True:
        page, page_cursor = live_cache.list_jobs(
            cursor=page_cursor,
            limit=100,
            status=status,
            q=q,
            sort=sort,
            started_after=started_after,
            started_before=started_before,
            failed_within_hours=failed_within_hours,
            job_kind=job_kind,
        )
        live_items.extend(page)
        if page_cursor is None:
            break
    summaries: dict[str, JobSummary] = {j.job_id: j for j in live_items}

    if include_archived and snapshot_store.enabled():
        live_set = set(live_cache._state.jobs.keys())
        for archived in snapshot_store.iter_job_summaries():
            if archived.job_id in live_set:
                continue
            if not _job_matches_filters(
                archived,
                status=status,
                q=q,
                started_after=started_after,
                started_before=started_before,
                failed_within_hours=failed_within_hours,
                job_kind=job_kind,
            ):
                continue
            summaries[archived.job_id] = archived.model_copy(update={"archived": True})
        job_ids = _sort_job_ids(list(summaries.keys()), summaries, sort)
    else:
        job_ids = _sort_job_ids(list(summaries.keys()), summaries, sort)

    start = 0
    if cursor:
        idx = bisect.bisect_left(job_ids, cursor)
        if idx < len(job_ids) and job_ids[idx] == cursor:
            start = idx + 1
        elif idx < len(job_ids):
            start = idx
    slice_ids = job_ids[start : start + limit]
    items = [summaries[jid] for jid in slice_ids]
    has_more = len(slice_ids) == limit and start + limit < len(job_ids)
    next_cursor = slice_ids[-1] if has_more else None
    return items, next_cursor
