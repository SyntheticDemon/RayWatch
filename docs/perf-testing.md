# Performance testing (incremental)

RayWatch optimizes in **layers**. Each layer must pass **`make test`** and **`make perf`** before the next change lands.

## Commands

| Command | What it runs |
|---------|----------------|
| `make test` | Unit + NFR SLO tests (no integration, benchmark, or perf) |
| `make perf` | Correctness + read-path latency regression vs committed baselines |
| `make benchmark` | Informational RayWatch vs Ray dashboard table (no thresholds) |
| `make benchmark-ray` | Same with live Ray head (capped job submit; see harness) |

## Layout

```
tests/perf/
  baselines.json          # committed p95 ceilings per scenario (update intentionally)
  harness.py              # seed, measure, compare, optional log append
  test_live_cache_jobs.py # index/cursor correctness (fast)
  test_read_path_latency.py # API p95 at 1k/5k/10k jobs vs baselines
tests/nfr/test_dashboard_latency_benchmark.py  # vs Ray (benchmark marker)
docs/perf-improvement-log.md                   # human step report after each layer
```

## Workflow (one optimization layer)

1. Record **before** numbers: `make perf` (note output or copy from log).
2. Implement **one** focused change (e.g. sorted job index, batch rebuild).
3. `make test` — must pass.
4. `make perf` — must not regress above `baselines.json` (see `PERF_REGRESSION_PCT`).
5. If faster and intentional: `PERF_UPDATE_BASELINE=1 make perf` to refresh baselines.
6. Append a section to [perf-improvement-log.md](./perf-improvement-log.md) with before/after table and test commands run.

## Baselines

- Stored in `tests/perf/baselines.json` as **maximum allowed p95 (ms)** per scenario.
- Perf tests **fail** if measured p95 exceeds `max(baseline × (1 + PERF_REGRESSION_PCT/100), baseline + PERF_REGRESSION_ABS_MS)` (defaults: 25%, +2.5ms).
- Ray comparison tests have **no** pass/fail on beating Ray — use `make benchmark-ray` and the improvement log for evidence.

## Honest latency (no cheating)

| Rule | Why |
|------|-----|
| **`live_cache.reset()`** between perf scenarios | Avoid measuring a warmed index from a prior scale |
| **New `ASGITransport` + `AsyncClient` per sample** | No keep-alive / connection reuse inflating later samples |
| **`PERF_WARMUP=0` default** on `make perf` | Regression p95 **includes** the cold first request |
| **NFR tests** assert both `cold` and full-sample p95 | See `tests/nfr/test_api_latency.py` |
| **Benchmarks** | `BENCHMARK_WARMUP=0` default; set `BENCHMARK_WARMUP=3` only for informational “steady state” runs |

There is **no database cache** in MVP; “cached db” here means **in-memory `live_cache`** and **HTTP client reuse**—both are controlled explicitly.

## Safety (do not crash the machine)

- Ray job submit during benchmarks is capped by `BENCHMARK_RAY_MAX_JOBS` (default **100**).
- RayWatch-only scales default to **1000, 5000, 10000** in RAM (no Ray submit).
- Override scales only when you accept memory/CPU cost.
