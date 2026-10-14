"""API entrypoint with embedded sync loop for MVP."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from raywatch.api.routes import cluster, jobs, meta, search, tasks, ws
from raywatch.api.state import live_cache
from raywatch.collector.sync_loop import run_sync_loop, sync_active_jobs
from raywatch.engine.sync_side_effects import job_snapshot_store

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    repo_root = Path(__file__).resolve().parents[5]
    fixture_default = repo_root / "tests" / "fixtures" / "ray" / "jobs_list.json"
    use_live = os.environ.get("RAYWATCH_USE_LIVE") == "1"
    if use_live:
        os.environ.pop("RAYWATCH_FIXTURE_JOBS", None)
    elif not os.environ.get("RAYWATCH_FIXTURE_JOBS") and fixture_default.is_file():
        os.environ.setdefault("RAYWATCH_FIXTURE_JOBS", str(fixture_default))

    job_snapshot_store().ensure_schema()
    await sync_active_jobs(live_cache)
    interval = float(os.environ.get("RAYWATCH_SYNC_INTERVAL_SEC", "5"))
    sync_task = asyncio.create_task(run_sync_loop(live_cache, interval_sec=interval))
    logger.info("RayWatch API started; sync interval %.1fs", interval)
    yield
    sync_task.cancel()
    with suppress(asyncio.CancelledError):
        await sync_task


app = FastAPI(title="RayWatch API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(search.router)
app.include_router(cluster.router)
app.include_router(jobs.router)
app.include_router(tasks.router)
app.include_router(ws.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, object]:
    sync = live_cache.sync_meta()
    return {
        "ready": sync.last_sync_at is not None,
        "ray_out_of_sync": sync.ray_out_of_sync,
        "job_count": live_cache.job_count(),
    }


def run() -> None:
    import uvicorn

    uvicorn.run(
        "raywatch.api.main:app",
        host=os.environ.get("API_HOST", "0.0.0.0"),
        port=int(os.environ.get("API_PORT", "8080")),
        reload=False,
    )


if __name__ == "__main__":
    run()
