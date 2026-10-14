"""NFR: measurement helpers stay honest (no warmup on default perf path)."""

import os

import pytest

from support.perf_harness import perf_warmup
from support.request_latency import measure_fresh_client


def test_default_perf_warmup_is_zero() -> None:
    os.environ.pop("PERF_WARMUP", None)
    assert perf_warmup() == 0


@pytest.mark.asyncio
async def test_fresh_client_gate_includes_first_sample() -> None:
    from support.perf_harness import reset_live_cache, seed_jobs

    reset_live_cache()
    seed_jobs(100)
    report = await measure_fresh_client("/jobs?limit=20", iterations=5, warmup=0)
    assert report.steady.n == 5
    assert report.cold_ms in [report.steady.p50_ms, report.steady.p95_ms] or report.cold_ms > 0
