import asyncio

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from raywatch.api.state import live_cache
from raywatch.engine.live_hub import live_hub
from raywatch.engine.sync_side_effects import resolve_job

router = APIRouter(tags=["ws"])


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
                    message = {
                        **message,
                        "job": job.model_dump(mode="json"),
                        "job_id": job_id,
                    }
            await websocket.send_json(message)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        live_hub.unsubscribe("*", queue)
