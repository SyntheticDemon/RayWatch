"""Standalone collector CLI (optional; MVP sync runs inside API)."""

import asyncio
import logging
import os

from raywatch.collector.sync_loop import run_sync_loop
from raywatch.engine.live_cache import LiveCache

logging.basicConfig(level=logging.INFO)


def run() -> None:
    live_cache = LiveCache()
    fixture = os.environ.get("RAYWATCH_FIXTURE_JOBS")
    if fixture:
        logging.info("Collector using fixture jobs at %s", fixture)
    interval = float(os.environ.get("RAYWATCH_SYNC_INTERVAL_SEC", "5"))
    asyncio.run(run_sync_loop(live_cache, interval_sec=interval))


if __name__ == "__main__":
    run()
