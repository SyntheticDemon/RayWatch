import asyncio
import contextlib

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from raywatch.adapter_ray.job_logs import fetch_logs_for_job
from raywatch.adapter_ray.ray_log_tail import stream_ray_job_log_tail
from raywatch.api.state import live_cache
from raywatch.engine.live_hub import live_hub
from raywatch.engine.sync_side_effects import resolve_job

router = APIRouter(tags=["ws"])

_JOB_WS_TASKS_LIMIT = 200


@router.websocket("/ws/live")
async def websocket_live(
    websocket: WebSocket,
    job_id: str | None = Query(default=None),
) -> None:
    await websocket.accept()
    queue = live_hub.subscribe("*")
    try:
        while True:
            message = await queue.get()
            if job_id and message.get("type") == "sync":
                job = resolve_job(live_cache, job_id)
                if job is not None:
                    tasks, _ = live_cache.list_tasks_for_job(
                        job_id, cursor=None, limit=_JOB_WS_TASKS_LIMIT
                    )
                    message = {
                        **message,
                        "job": job.model_dump(mode="json"),
                        "job_id": job_id,
                        "tasks_preview": [task.model_dump(mode="json") for task in tasks],
                    }
            await websocket.send_json(message)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        live_hub.unsubscribe("*", queue)


@router.websocket("/ws/job-logs")
async def websocket_job_logs(
    websocket: WebSocket,
    job_id: str = Query(..., min_length=1),
) -> None:
    """Proxy Ray `/api/jobs/{id}/logs/tail` or send fixture logs once."""
    job = resolve_job(live_cache, job_id)
    if job is None:
        await websocket.close(code=4404, reason="JOB_NOT_FOUND")
        return

    await websocket.accept()
    sync = live_cache.sync_meta()
    try:
        if sync.cluster_epoch == "fixture":
            text = await fetch_logs_for_job(job, cluster_epoch=sync.cluster_epoch)
            if text:
                await websocket.send_text(text)
        else:
            async for chunk in stream_ray_job_log_tail(job.job_id):
                await websocket.send_text(chunk)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as exc:
        with contextlib.suppress(RuntimeError):
            await websocket.send_text(f"\n[raywatch] log tail error: {exc}\n")
    finally:
        with contextlib.suppress(RuntimeError):
            await websocket.close()
