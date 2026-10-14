"""Shared perf harness: seed cache, measure API latency, compare to baselines."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus
from raywatch.model.task import TaskStatus, TaskSummary

from support.request_latency import HonestLatencyReport, measure_fresh_client

BASELINES_PATH = Path(__file__).resolve().parents[1] / "perf" / "baselines.json"
IMPROVEMENT_LOG = Path(__file__).resolve().parents[2] / "docs" / "perf-improvement-log.md"


@dataclass(frozen=True)
class ScenarioResult:
    name: str
    job_count: int
    report: HonestLatencyReport
    baseline_p95_ms: float
    allowed_p95_ms: float


def load_baselines() -> dict:
    return json.loads(BASELINES_PATH.read_text(encoding="utf-8"))


def save_baselines(data: dict) -> None:
    BASELINES_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def regression_allowance_pct() -> float:
    # Microbenchmark noise on the 1k-job cold path can exceed 15% between CI runners.
    return float(os.environ.get("PERF_REGRESSION_PCT", "25"))


def reset_live_cache() -> None:
    live_cache.reset()


def seed_jobs(count: int, prefix: str = "perf-job") -> None:
    ops = [
        IngestOp(
            kind="upsert_job",
            job=JobDetail(
                job_id=f"{prefix}-{index:07d}",
                status=JobStatus.RUNNING,
                entrypoint="python work.py",
            ),
        )
        for index in range(count)
    ]
    live_cache.apply_ingest_batch(IngestBatch(ops=ops))


def perf_iterations() -> int:
    return int(os.environ.get("PERF_ITERATIONS", "20"))


def perf_warmup() -> int:
    """Default 0: regression must include cold first request (no cheating via warmup)."""
    return int(os.environ.get("PERF_WARMUP", "0"))


async def measure_jobs_list_honest(limit: int = 50) -> HonestLatencyReport:
    return await measure_fresh_client(
        f"/jobs?limit={limit}",
        iterations=perf_iterations(),
        warmup=perf_warmup(),
    )


async def measure_job_get_honest(job_id: str) -> HonestLatencyReport:
    return await measure_fresh_client(
        f"/jobs/{job_id}",
        iterations=perf_iterations(),
        warmup=perf_warmup(),
    )


def seed_tasks(job_id: str, count: int, prefix: str = "perf-task") -> None:
    ops = [
        IngestOp(
            kind="upsert_task",
            task=TaskSummary(
                task_id=f"{prefix}-{index:06d}",
                job_id=job_id,
                status=TaskStatus.RUNNING,
                name=f"step_{index}",
            ),
        )
        for index in range(count)
    ]
    live_cache.apply_ingest_batch(IngestBatch(ops=ops))


async def measure_cluster_overview_honest() -> HonestLatencyReport:
    return await measure_fresh_client(
        "/cluster/overview",
        iterations=perf_iterations(),
        warmup=perf_warmup(),
    )


async def measure_job_tasks_honest(job_id: str, limit: int = 100) -> HonestLatencyReport:
    return await measure_fresh_client(
        f"/jobs/{job_id}/tasks?limit={limit}",
        iterations=perf_iterations(),
        warmup=perf_warmup(),
    )


async def measure_task_get_honest(task_id: str) -> HonestLatencyReport:
    return await measure_fresh_client(
        f"/tasks/{task_id}",
        iterations=perf_iterations(),
        warmup=perf_warmup(),
    )


async def measure_job_logs_honest(job_id: str) -> HonestLatencyReport:
    from raywatch.adapter_ray.log_fetch_cache import put_cached_log

    epoch = live_cache.sync_meta().cluster_epoch
    put_cached_log(epoch, job_id, "\n".join(f"perf-log-line-{i}" for i in range(400)))
    return await measure_fresh_client(
        f"/jobs/{job_id}/logs?tail_lines=100",
        iterations=perf_iterations(),
        warmup=perf_warmup(),
    )


async def measure_search_honest(q: str = "perf") -> HonestLatencyReport:
    return await measure_fresh_client(
        f"/search?q={q}&limit=20",
        iterations=perf_iterations(),
        warmup=perf_warmup(),
    )


def allowed_p95(baseline_p95: float) -> float:
    pct_cap = baseline_p95 * (1.0 + regression_allowance_pct() / 100.0)
    abs_slack = float(os.environ.get("PERF_REGRESSION_ABS_MS", "2.5"))
    return max(pct_cap, baseline_p95 + abs_slack)


def check_scenario(
    name: str,
    job_count: int,
    report: HonestLatencyReport,
    baseline_p95: float,
    baseline_cold_ms: float | None = None,
) -> ScenarioResult:
    gate = report.gate_p95_ms
    cap = allowed_p95(baseline_p95)
    if os.environ.get("PERF_UPDATE_BASELINE") != "1":
        if gate > cap:
            raise AssertionError(
                f"{name}: gate_p95={gate:.2f}ms (cold={report.cold_ms:.2f}ms) exceeds allowed "
                f"{cap:.2f}ms (baseline {baseline_p95:.2f}ms + "
                f"{regression_allowance_pct():.0f}% slack)"
            )
        if baseline_cold_ms is not None:
            cold_cap = allowed_p95(baseline_cold_ms)
            if report.cold_ms > cold_cap:
                raise AssertionError(
                    f"{name}: cold={report.cold_ms:.2f}ms exceeds allowed {cold_cap:.2f}ms "
                    f"(baseline cold {baseline_cold_ms:.2f}ms)"
                )
    return ScenarioResult(
        name=name,
        job_count=job_count,
        report=report,
        baseline_p95_ms=baseline_p95,
        allowed_p95_ms=cap,
    )


def format_results_table(results: list[ScenarioResult]) -> str:
    lines = [
        "| scenario | jobs | cold (ms) | gate p95 (ms) | baseline (ms) | allowed (ms) |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in results:
        lines.append(
            f"| {row.name} | {row.job_count} | {row.report.cold_ms:.2f} | "
            f"{row.report.gate_p95_ms:.2f} | {row.baseline_p95_ms:.2f} | {row.allowed_p95_ms:.2f} |"
        )
    return "\n".join(lines)


def maybe_update_baselines(results: list[ScenarioResult]) -> None:
    if os.environ.get("PERF_UPDATE_BASELINE") != "1":
        return
    data = load_baselines()
    for row in results:
        data["scenarios"][row.name]["p95_ms"] = round(row.report.gate_p95_ms, 2)
        data["scenarios"][row.name]["cold_ms"] = round(row.report.cold_ms, 2)
    save_baselines(data)
