from fastapi import APIRouter
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import sync_active_jobs
from raywatch.model.api_dto import FreshnessResponse, SyncTriggerResponse

router = APIRouter(tags=["meta"])


@router.get("/freshness", response_model=FreshnessResponse)
def get_freshness() -> FreshnessResponse:
    return FreshnessResponse(
        sync=live_cache.sync_meta(),
        job_count=live_cache.job_count(),
        task_count=live_cache.task_count(),
    )


@router.post("/sync/trigger", response_model=SyncTriggerResponse)
async def trigger_sync() -> SyncTriggerResponse:
    await sync_active_jobs(live_cache)
    return SyncTriggerResponse(
        accepted=True,
        message="Sync completed",
        sync=live_cache.sync_meta(),
        job_count=live_cache.job_count(),
        task_count=live_cache.task_count(),
    )
