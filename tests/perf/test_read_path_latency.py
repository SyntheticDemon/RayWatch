"""Read-path latency vs committed baselines (regression guard)."""

import pytest

from support.benchmark_results import SECTION_PERF, write_jobs_list_latency_report
from support.feature_latency_registry import write_feature_latency_registry
from support.perf_harness import (
    check_scenario,
    format_results_table,
    load_baselines,
    maybe_update_baselines,
    measure_cluster_overview_honest,
    measure_job_get_honest,
    measure_job_logs_honest,
    measure_job_tasks_honest,
    measure_jobs_list_honest,
    measure_search_honest,
    measure_task_get_honest,
    reset_live_cache,
    seed_jobs,
    seed_tasks,
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

    reset_live_cache()
    seed_jobs(1000)
    report = await measure_cluster_overview_honest()
    spec = baselines["scenarios"]["cluster_overview"]
    results.append(
        check_scenario(
            "cluster_overview",
            int(spec["job_count"]),
            report,
            float(spec["p95_ms"]),
            float(spec["cold_ms"]) if "cold_ms" in spec else None,
        ),
    )

    reset_live_cache()
    seed_jobs(1, prefix="perf-job-tasks")
    job_id = "perf-job-tasks-0000000"
    seed_tasks(job_id, 1000)
    report = await measure_job_tasks_honest(job_id)
    spec = baselines["scenarios"]["job_tasks_1000"]
    results.append(
        check_scenario(
            "job_tasks_1000",
            int(spec.get("task_count", 1000)),
            report,
            float(spec["p95_ms"]),
            float(spec["cold_ms"]) if "cold_ms" in spec else None,
        ),
    )

    task_id = "perf-task-000500"
    report = await measure_task_get_honest(task_id)
    spec = baselines["scenarios"]["task_get_1000"]
    results.append(
        check_scenario(
            "task_get_1000",
            int(spec.get("task_count", 1000)),
            report,
            float(spec["p95_ms"]),
            float(spec["cold_ms"]) if "cold_ms" in spec else None,
        ),
    )

    reset_live_cache()
    seed_jobs(1000)
    report = await measure_search_honest("perf-job")
    spec = baselines["scenarios"]["search_1000_jobs"]
    results.append(
        check_scenario(
            "search_1000_jobs",
            int(spec["job_count"]),
            report,
            float(spec["p95_ms"]),
            float(spec["cold_ms"]) if "cold_ms" in spec else None,
        ),
    )

    reset_live_cache()
    seed_jobs(1, prefix="perf-log-job")
    log_job_id = "perf-log-job-0000000"
    log_report = await measure_job_logs_honest(log_job_id)
    spec = baselines["scenarios"]["job_logs_cached"]
    results.append(
        check_scenario(
            "job_logs_cached",
            int(spec["job_count"]),
            log_report,
            float(spec["p95_ms"]),
            float(spec["cold_ms"]) if "cold_ms" in spec else None,
        ),
    )

    maybe_update_baselines(results)
    registry_path = write_feature_latency_registry(results)
    print(f"Wrote {registry_path}\n")
    table = format_results_table(results)
    print("\n### make perf — read path\n\n" + table + "\n")
    path = write_jobs_list_latency_report(
        SECTION_PERF,
        table,
        note="Fresh HTTP client per sample; `PERF_WARMUP=0` (cold included in gate p95).",
    )
    print(f"Wrote {path}\n")
