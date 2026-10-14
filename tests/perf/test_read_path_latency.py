"""Read-path latency vs committed baselines (regression guard)."""

import pytest

from support.benchmark_results import SECTION_PERF, write_jobs_list_latency_report
from support.perf_harness import (
    check_scenario,
    format_results_table,
    load_baselines,
    maybe_update_baselines,
    measure_job_get_honest,
    measure_jobs_list_honest,
    reset_live_cache,
    seed_jobs,
)

pytestmark = pytest.mark.perf


@pytest.mark.asyncio
async def test_jobs_list_and_get_latency_within_baselines() -> None:
    baselines = load_baselines()
    results = []

    for name in ("jobs_list_1000", "jobs_list_5000", "jobs_list_10000"):
        spec = baselines["scenarios"][name]
        count = int(spec["job_count"])
        reset_live_cache()
        seed_jobs(count)
        report = await measure_jobs_list_honest()
        results.append(
            check_scenario(
                name,
                count,
                report,
                float(spec["p95_ms"]),
                float(spec["cold_ms"]) if "cold_ms" in spec else None,
            ),
        )

    reset_live_cache()
    seed_jobs(5000)
    get_report = await measure_job_get_honest("perf-job-0002500")
    spec = baselines["scenarios"]["job_get_5000"]
    results.append(
        check_scenario(
            "job_get_5000",
            int(spec["job_count"]),
            get_report,
            float(spec["p95_ms"]),
            float(spec["cold_ms"]) if "cold_ms" in spec else None,
        ),
    )

    maybe_update_baselines(results)
    table = format_results_table(results)
    print("\n### make perf — read path\n\n" + table + "\n")
    path = write_jobs_list_latency_report(
        SECTION_PERF,
        table,
        note="Fresh HTTP client per sample; `PERF_WARMUP=0` (cold included in gate p95).",
    )
    print(f"Wrote {path}\n")
