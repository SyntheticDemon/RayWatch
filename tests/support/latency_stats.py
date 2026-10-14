"""Sample request latency and compute simple percentiles (no pass/fail thresholds)."""

from __future__ import annotations

import statistics
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from time import perf_counter


@dataclass(frozen=True)
class LatencySample:
    p50_ms: float
    p95_ms: float
    mean_ms: float
    n: int


def percentile_ms(samples_ms: list[float], p: float) -> float:
    if not samples_ms:
        return 0.0
    ordered = sorted(samples_ms)
    index = max(0, min(len(ordered) - 1, int(p * len(ordered)) - 1))
    return ordered[index]


async def measure_async(
    request: Callable[[], Awaitable[None]],
    *,
    iterations: int = 25,
    warmup: int = 3,
) -> LatencySample:
    for _ in range(warmup):
        await request()
    samples_ms: list[float] = []
    for _ in range(iterations):
        start = perf_counter()
        await request()
        samples_ms.append((perf_counter() - start) * 1000)
    return LatencySample(
        p50_ms=percentile_ms(samples_ms, 0.50),
        p95_ms=percentile_ms(samples_ms, 0.95),
        mean_ms=statistics.mean(samples_ms),
        n=len(samples_ms),
    )
