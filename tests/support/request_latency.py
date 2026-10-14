"""Measure HTTP latency without hidden warm-cache (fresh client per sample)."""

from __future__ import annotations

import statistics
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from time import perf_counter

from httpx import ASGITransport, AsyncClient
from raywatch.api.main import app

from support.latency_stats import LatencySample, percentile_ms


@dataclass(frozen=True)
class HonestLatencyReport:
    """cold = first sample; steady p95 = all samples (no discarded warmup by default)."""

    cold_ms: float
    steady: LatencySample

    @property
    def gate_p95_ms(self) -> float:
        """Regression gate: p95 over every fresh-client sample (includes cold)."""
        return self.steady.p95_ms


async def measure_fresh_client(
    request_path: str,
    *,
    iterations: int = 20,
    warmup: int = 0,
) -> HonestLatencyReport:
    """
    Each sample uses a new ASGITransport + AsyncClient (no keep-alive cheating).

    warmup iterations run before timing but are NOT included in steady stats.
    Perf regression uses warmup=0 so the first timed sample is cold.
    """
    if warmup > 0:
        for _ in range(warmup):
            await _one_get(request_path)

    samples_ms: list[float] = []
    for _ in range(iterations):
        start = perf_counter()
        await _one_get(request_path)
        samples_ms.append((perf_counter() - start) * 1000)

    cold_ms = samples_ms[0] if samples_ms else 0.0
    steady = LatencySample(
        p50_ms=percentile_ms(samples_ms, 0.50),
        p95_ms=percentile_ms(samples_ms, 0.95),
        mean_ms=statistics.mean(samples_ms) if samples_ms else 0.0,
        n=len(samples_ms),
    )
    return HonestLatencyReport(cold_ms=cold_ms, steady=steady)


async def _one_get(path: str) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(path)
        response.raise_for_status()
