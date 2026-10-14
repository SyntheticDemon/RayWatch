"""Unit tests for latency stats, perf harness, and benchmark helpers."""

import json
from pathlib import Path

import pytest

from support.dashboard_benchmark import (
    ScaleLatencyRow,
    collect_scale_rows,
    format_latency_table,
    parse_scale_list,
)
from support.latency_stats import LatencySample, measure_async, percentile_ms
from support.perf_harness import (
    allowed_p95,
    check_scenario,
    format_results_table,
    load_baselines,
    maybe_update_baselines,
    regression_allowance_pct,
    reset_live_cache,
    seed_jobs,
)
from support.request_latency import HonestLatencyReport, measure_fresh_client


def test_percentile_ms_empty() -> None:
    assert percentile_ms([], 0.95) == 0.0


def test_percentile_ms_single_sample() -> None:
    assert percentile_ms([42.0], 0.95) == 42.0


@pytest.mark.asyncio
async def test_measure_async_with_warmup_excludes_warmup_from_stats() -> None:
    counter = 0

    async def tick() -> None:
        nonlocal counter
        counter += 1

    sample = await measure_async(tick, iterations=3, warmup=2)
    assert counter == 5
    assert sample.n == 3


def test_perf_harness_regression_allowance() -> None:
    assert allowed_p95(100.0) == 100.0 * (1 + regression_allowance_pct() / 100)


def test_check_scenario_fails_when_over_baseline() -> None:
    report = HonestLatencyReport(
        cold_ms=50.0,
        steady=LatencySample(p50_ms=50.0, p95_ms=50.0, mean_ms=50.0, n=5),
    )
    with pytest.raises(AssertionError, match="gate_p95"):
        check_scenario("x", 100, report, baseline_p95=1.0)


def test_check_scenario_cold_gate() -> None:
    report = HonestLatencyReport(
        cold_ms=100.0,
        steady=LatencySample(p50_ms=1.0, p95_ms=1.0, mean_ms=1.0, n=5),
    )
    with pytest.raises(AssertionError, match="cold="):
        check_scenario("x", 100, report, baseline_p95=10.0, baseline_cold_ms=1.0)


def test_format_results_and_benchmark_table(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    report = HonestLatencyReport(
        cold_ms=2.0,
        steady=LatencySample(p50_ms=1.5, p95_ms=2.5, mean_ms=1.6, n=10),
    )
    row = check_scenario("jobs_list_1000", 1000, report, baseline_p95=100.0)
    table = format_results_table([row])
    assert "cold (ms)" in table
    assert "2.50" in table or "2.5" in table

    from support.benchmark_results import SECTION_RAY_COMPARE, write_jobs_list_latency_report

    report = tmp_path / "jobs-list-latency.md"
    monkeypatch.setattr("support.benchmark_results.REPORT_PATH", report)
    path = write_jobs_list_latency_report(SECTION_RAY_COMPARE, "| t |", note="test")
    assert path == report


def test_parse_scale_list_dedupes_and_sorts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BENCHMARK_JOB_SCALES", "100,50,50")
    assert parse_scale_list("BENCHMARK_JOB_SCALES", "10") == [50, 100]


def test_dashboard_format_latency_table() -> None:
    row = ScaleLatencyRow(
        job_count=10,
        raywatch_list_cold_ms=3.0,
        raywatch_list_warm_p95_ms=2.0,
        raywatch_get_warm_p95_ms=1.5,
        ray_dashboard_list_cold_ms=None,
        ray_dashboard_list_warm_p95_ms=None,
        ray_jobs_in_payload=None,
    )
    md = format_latency_table([row])
    assert "10" in md
    assert "warm p95" in md
    assert "—" in md


@pytest.mark.asyncio
async def test_collect_scale_rows_raywatch_only() -> None:
    reset_live_cache()
    rows = await collect_scale_rows([50], include_ray_dashboard=False)
    assert len(rows) == 1
    assert rows[0].job_count == 50
    assert rows[0].ray_dashboard_list_warm_p95_ms is None


@pytest.mark.asyncio
async def test_measure_fresh_client_honest_report() -> None:
    reset_live_cache()
    seed_jobs(5)
    report = await measure_fresh_client("/jobs?limit=10", iterations=3, warmup=0)
    assert report.steady.n == 3
    assert report.cold_ms > 0
    assert report.gate_p95_ms == report.steady.p95_ms


def test_maybe_update_baselines_writes_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    baseline_file = tmp_path / "baselines.json"
    baseline_file.write_text(
        json.dumps(
            {
                "scenarios": {
                    "jobs_list_1000": {"job_count": 1000, "p95_ms": 99.0},
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr("support.perf_harness.BASELINES_PATH", baseline_file)
    monkeypatch.setenv("PERF_UPDATE_BASELINE", "1")
    report = HonestLatencyReport(
        cold_ms=1.0,
        steady=LatencySample(1.0, 2.0, 1.5, 5),
    )
    from support.perf_harness import ScenarioResult

    row = ScenarioResult("jobs_list_1000", 1000, report, 99.0, 110.0)
    maybe_update_baselines([row])
    data = json.loads(baseline_file.read_text())
    assert data["scenarios"]["jobs_list_1000"]["p95_ms"] == 2.0
    monkeypatch.delenv("PERF_UPDATE_BASELINE", raising=False)


def test_load_baselines_real_file() -> None:
    data = load_baselines()
    assert "scenarios" in data
    assert "jobs_list_1000" in data["scenarios"]


def test_benchmark_results_merges_sections(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from support.benchmark_results import (
        SECTION_PERF,
        SECTION_RAY_COMPARE,
        write_jobs_list_latency_report,
    )

    report = tmp_path / "jobs-list-latency.md"
    monkeypatch.setattr("support.benchmark_results.REPORT_PATH", report)
    write_jobs_list_latency_report(SECTION_PERF, "| perf |")
    write_jobs_list_latency_report(SECTION_RAY_COMPARE, "| ray |")
    text = report.read_text(encoding="utf-8")
    assert SECTION_PERF in text and "| perf |" in text
    assert SECTION_RAY_COMPARE in text and "| ray |" in text


@pytest.mark.asyncio
async def test_ray_dashboard_reachable_false(monkeypatch: pytest.MonkeyPatch) -> None:
    from support.dashboard_benchmark import ray_dashboard_reachable

    monkeypatch.setenv("RAY_DASHBOARD_URL", "http://127.0.0.1:1")
    assert await ray_dashboard_reachable() is False
