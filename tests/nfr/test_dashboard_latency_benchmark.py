"""Informational latency table: RayWatch API vs Ray dashboard jobs API by job count."""

import os

import pytest

from support.dashboard_benchmark import (
    collect_scale_rows,
    format_latency_table,
    maybe_write_benchmark_table,
    parse_scale_list,
    ray_dashboard_reachable,
    warm_parity_violations,
)

pytestmark = pytest.mark.benchmark


@pytest.mark.asyncio
async def test_jobs_list_latency_raywatch_vs_ray_dashboard_table() -> None:
    """Print a markdown table (p95 ms). No pass/fail thresholds — benchmark only."""
    compare_ray = (
        os.environ.get("RAYWATCH_BENCHMARK_COMPARE_RAY") == "1"
        or os.environ.get("RAY_INTEGRATION") == "1"
    ) and await ray_dashboard_reachable()
    default_scales = "10,25,50" if compare_ray else "50,200,500,1000"
    scales = parse_scale_list("BENCHMARK_JOB_SCALES", default_scales)
    rows = await collect_scale_rows(scales, include_ray_dashboard=compare_ray)
    table = format_latency_table(rows)
    banner = (
        "\n\n### Jobs list latency benchmark (cold + warm p95 ms)\n\n"
        f"Warm p95 uses BENCHMARK_WARMUP discarded iterations. "
        f"Ray dashboard column: "
        f"{'included (live cluster)' if compare_ray else 'skipped (no Ray head)'}\n\n"
    )
    print(banner + table + "\n")
    path = maybe_write_benchmark_table(table, ray_included=compare_ray)
    print(f"Wrote {path}\n")

    if os.environ.get("RAYWATCH_BENCHMARK_ASSERT_WARM") == "1" and compare_ray:
        violations = warm_parity_violations(rows)
        assert not violations, "Warm jobs-list p95 must beat Ray dashboard:\n" + "\n".join(
            violations
        )
