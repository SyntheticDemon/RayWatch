"""API entrypoint (scaffold)."""

import uvicorn
from fastapi import FastAPI

app = FastAPI(title="RayWatch API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, bool]:
    # Collector wiring will set ray_out_of_sync / sync_delay later.
    return {"ready": True, "ray_out_of_sync": False}


def run() -> None:
    uvicorn.run(
        "raywatch.api.main:app",
        host="0.0.0.0",
        port=8080,
        reload=False,
    )


if __name__ == "__main__":
    run()
