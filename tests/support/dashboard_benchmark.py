"""RayWatch vs Ray dashboard jobs-list latency benchmark (informational)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import httpx
from raywatch.adapter_ray.normalize_jobs import _job_rows_from_payload
from raywatch.adapter_ray.ray_client import fetch_jobs_json, ray_dashboard_base_url
from raywatch.api.state import live_cache
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus

from support.latency_stats import LatencySample, percentile_ms
from support.perf_harness import reset_live_cache
from support.request_latency import measure_fresh_client


@dataclass(frozen=True)
class ScaleLatencyRow:
    job_count: int
    raywatch_list: LatencySample
    raywatch_get: LatencySample
    ray_dashboard_jobs: LatencySample | None
    ray_jobs_in_payload: int | None


def parse_scale_list(env_name: str, default: str) -> list[int]:
    raw = os.environ.get(env_name, default)
    scales = [int(part.strip()) for part in raw.split(",") if part.strip()]
    return sorted({max(0, value) for value in scales})


def seed_raywatch_jobs(count: int, *, scenario_id: int) -> None:
    reset_live_cache()
    prefix = f"bench-{scenario_id:04d}"
    ops = [
        IngestOp(
            kind="upsert_job",
            job=JobDetail(
                job_id=f"{prefix}-job-{index:06d}",
                status=JobStatus.RUNNING,
                entrypoint="python work.py",
            ),
        )
        for index in range(count)
    ]
    live_cache.apply_ingest_batch(IngestBatch(ops=ops))


async def measure_raywatch_jobs_list(limit: int = 50) -> LatencySample:
    report = await measure_fresh_client(
        f"/jobs?limit={limit}",
        iterations=int(os.environ.get("BENCHMARK_ITERATIONS", "15")),
        warmup=int(os.environ.get("BENCHMARK_WARMUP", "0")),
    )
    return report.steady


async def measure_raywatch_job_get(job_id: str) -> LatencySample:
    report = await measure_fresh_client(
        f"/jobs/{job_id}",
        iterations=int(os.environ.get("BENCHMARK_ITERATIONS", "15")),
        warmup=int(os.environ.get("BENCHMARK_WARMUP", "0")),
    )
    return report.steady


async def measure_ray_dashboard_jobs_api() -> tuple[LatencySample, int]:
    base = ray_dashboard_base_url()
    iterations = int(os.environ.get("BENCHMARK_ITERATIONS", "15"))

    async def one_fetch() -> None:
        async with httpx.AsyncClient() as client:
            await fetch_jobs_json(client)

    # Fresh httpx client per sample (same honesty as RayWatch path).
    samples_ms: list[float] = []
    from time import perf_counter

    for _ in range(iterations):
        start = perf_counter()
        await one_fetch()
        samples_ms.append((perf_counter() - start) * 1000)
    sample = LatencySample(
        p50_ms=percentile_ms(samples_ms, 0.50),
        p95_ms=percentile_ms(samples_ms, 0.95),
        mean_ms=sum(samples_ms) / len(samples_ms),
        n=len(samples_ms),
    )
    async with httpx.AsyncClient() as client:
        payload = await fetch_jobs_json(client)
    job_count = len(_job_rows_from_payload(payload))
    return sample, job_count


async def ray_dashboard_reachable() -> bool:
    url = f"{ray_dashboard_base_url()}/api/version"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
    except httpx.HTTPError:
        return False
    return response.status_code == 200


async def submit_trivial_ray_jobs(count: int) -> None:
    """Submit quick jobs so Ray dashboard jobs API has more rows (live cluster only)."""
    if count <= 0:
        return
    cap = int(os.environ.get("BENCHMARK_RAY_MAX_JOBS", "100"))
    count = min(count, cap)
    base = ray_dashboard_base_url()
    entrypoint = 'python -c "pass"'
    async with httpx.AsyncClient() as client:
        for _ in range(count):
            response = await client.post(
                f"{base}/api/jobs/",
                json={"entrypoint": entrypoint},
                timeout=120.0,
            )
            response.raise_for_status()


async def ensure_ray_job_history_at_least(target: int, submitted_so_far: int) -> int:
    cap = int(os.environ.get("BENCHMARK_RAY_MAX_JOBS", "100"))
    target = min(target, cap)
    need = target - submitted_so_far
    if need > 0:
        await submit_trivial_ray_jobs(need)
        submitted_so_far = target
    return submitted_so_far


def format_latency_table(rows: list[ScaleLatencyRow]) -> str:
    headers = [
        "jobs",
        "raywatch GET /jobs p95 (ms)",
        "raywatch GET /jobs/{id} p95 (ms)",
        "ray dashboard GET /api/v0/jobs p95 (ms)",
        "ray jobs in API payload",
    ]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        mid = f"bench-job-{row.job_count // 2:06d}" if row.job_count else "bench-job-000000"
        get_p95 = f"{row.raywatch_get.p95_ms:.2f}" if row.job_count else "—"
        if row.ray_dashboard_jobs is None:
            ray_p95 = "—"
            ray_count = "—"
        else:
            ray_p95 = f"{row.ray_dashboard_jobs.p95_ms:.2f}"
            ray_count = str(row.ray_jobs_in_payload)
        lines.append(
            "| "
            + " | ".join(
                [
                    str(row.job_count),
                    f"{row.raywatch_list.p95_ms:.2f}",
                    get_p95,
                    ray_p95,
                    ray_count,
                ]
            )
            + " |"
        )
    return "\n".join(lines)


def write_benchmark_comparison_table(markdown: str, *, ray_included: bool) -> Path:
    from support.benchmark_results import SECTION_RAY_COMPARE, write_jobs_list_latency_report

    note = (
        "Ray dashboard column from live head (`RAY_INTEGRATION=1` or `make benchmark-ray`)."
        if ray_included
        else "Ray column skipped (no reachable Ray head). Run `make benchmark-ray` to compare."
    )
    return write_jobs_list_latency_report(SECTION_RAY_COMPARE, markdown, note=note)


def maybe_write_benchmark_table(markdown: str, *, ray_included: bool = False) -> Path | None:
    if os.environ.get("RAYWATCH_BENCHMARK_WRITE", "1") == "0":
        return None
    return write_benchmark_comparison_table(markdown, ray_included=ray_included)


async def collect_scale_rows(
    scales: list[int],
    *,
    include_ray_dashboard: bool,
) -> list[ScaleLatencyRow]:
    rows: list[ScaleLatencyRow] = []
    submitted_ray_jobs = 0
    for scale in scales:
        seed_raywatch_jobs(scale, scenario_id=scale)
        list_sample = await measure_raywatch_jobs_list()
        if scale > 0:
            prefix = f"bench-{scale:04d}"
            job_id = f"{prefix}-job-{min(scale - 1, scale // 2):06d}"
            get_sample = await measure_raywatch_job_get(job_id)
        else:
            get_sample = LatencySample(0.0, 0.0, 0.0, 0)

        ray_sample: LatencySample | None = None
        ray_count: int | None = None
        if include_ray_dashboard:
            submitted_ray_jobs = await ensure_ray_job_history_at_least(scale, submitted_ray_jobs)
            ray_sample, ray_count = await measure_ray_dashboard_jobs_api()

        rows.append(
            ScaleLatencyRow(
                job_count=scale,
                raywatch_list=list_sample,
                raywatch_get=get_sample,
                ray_dashboard_jobs=ray_sample,
                ray_jobs_in_payload=ray_count,
            )
        )
    return rows
