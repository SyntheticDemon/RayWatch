from fastapi import APIRouter, Query
from raywatch.api.state import live_cache
from raywatch.engine.sync_side_effects import job_snapshot_store
from raywatch.model.api_dto import SearchHit, SearchResponse

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
def search_entities(
    q: str = Query(min_length=1, max_length=200), limit: int = Query(20, ge=1, le=50)
) -> SearchResponse:
    raw = live_cache.search_entities(q, limit=limit)
    seen = {str(hit["id"]) for hit in raw if hit.get("id")}
    items = [
        SearchHit(
            kind=str(hit.get("kind") or "job"),
            id=str(hit["id"]),
            job_id=hit.get("job_id"),
            label=str(hit.get("label") or hit["id"]),
            status=hit.get("status"),
        )
        for hit in raw
        if hit.get("id")
    ]
    if len(items) < limit:
        for job in job_snapshot_store().search_jobs(q, limit=limit):
            if job.job_id in seen:
                continue
            items.append(
                SearchHit(
                    kind="job",
                    id=job.job_id,
                    job_id=job.job_id,
                    label=job.entrypoint or job.job_id,
                    status=job.status.value,
                )
            )
            seen.add(job.job_id)
            if len(items) >= limit:
                break
    return SearchResponse(items=items[:limit], sync=live_cache.sync_meta())
