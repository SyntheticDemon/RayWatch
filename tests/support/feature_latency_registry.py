"""Write benchmark-results/feature-latency-registry.md from perf scenario results."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from support.perf_harness import ScenarioResult

REGISTRY_PATH = (
    Path(__file__).resolve().parents[2] / "benchmark-results" / "feature-latency-registry.md"
)

FEATURE_MAP = {
    "jobs_list_1000": ("Jobs hub list", "P2", "GET /jobs"),
    "jobs_list_5000": ("Jobs hub list", "P2", "GET /jobs"),
    "jobs_list_10000": ("Jobs hub list", "P2", "GET /jobs"),
    "job_get_5000": ("Job detail", "P1", "GET /jobs/{id}"),
    "cluster_overview": ("Overview / cluster summary", "P2", "GET /cluster/overview"),
    "job_tasks_1000": ("Job task tree", "P1", "GET /jobs/{id}/tasks"),
    "task_get_1000": ("Task detail", "P1", "GET /tasks/{id}"),
    "search_1000_jobs": ("Command palette search", "P2", "GET /search"),
    "job_logs_cached": ("Job logs (cached tail)", "P5", "GET /jobs/{id}/logs"),
}


def write_feature_latency_registry(results: list[ScenarioResult]) -> Path:
    lines = [
        "# Feature latency registry",
        "",
        "Auto-updated by `make perf`. Maps **working features** to measured API latency (gate p95, cold ms).",
        "",
        f"_Last updated: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S UTC')}_",
        "",
        "| Feature | NFR | Endpoint | Scenario | Scale | Cold (ms) | Gate p95 (ms) | Baseline p95 |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for row in results:
        feature, nfr, endpoint = FEATURE_MAP.get(row.name, (row.name, "—", "—"))
        scale = row.job_count
        lines.append(
            f"| {feature} | {nfr} | `{endpoint}` | {row.name} | {scale} | "
            f"{row.report.cold_ms:.2f} | {row.report.gate_p95_ms:.2f} | {row.baseline_p95_ms:.2f} |"
        )
    lines.extend(
        [
            "",
            "Ray comparison (jobs list): see [jobs-list-latency.md](./jobs-list-latency.md).",
            "",
            "Live UI coverage: `make test-e2e`. Matrix: [docs/ray-dashboard-feature-matrix.md](../docs/ray-dashboard-feature-matrix.md).",
            "",
        ]
    )
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY_PATH.write_text("\n".join(lines), encoding="utf-8")
    return REGISTRY_PATH
