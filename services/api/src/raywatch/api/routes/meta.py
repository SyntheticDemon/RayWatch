from fastapi import APIRouter
from raywatch.api.state import live_cache
from raywatch.model.api_dto import FreshnessResponse

router = APIRouter(tags=["meta"])


@router.get("/freshness", response_model=FreshnessResponse)
def get_freshness() -> FreshnessResponse:
    return FreshnessResponse(
        sync=live_cache.sync_meta(),
        job_count=live_cache.job_count(),
        task_count=live_cache.task_count(),
    )
