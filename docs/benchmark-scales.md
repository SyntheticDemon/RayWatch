# Benchmark and demo job scales

## `make perf` (RayWatch in-memory only)

No Ray submit. Seeds **`live_cache`** via `IngestBatch` only.

| Scenario | Jobs in cache | What is measured |
|----------|---------------|------------------|
| `jobs_list_1000` | **1,000** | `GET /jobs?limit=50` |
| `jobs_list_5000` | **5,000** | same |
| `jobs_list_10000` | **10,000** | same |
| `job_get_5000` | **5,000** | `GET /jobs/{id}` |

Override: not typical; baselines live in `tests/perf/baselines.json`.

## `make benchmark` (RayWatch API, no Ray column unless head is up)

Default scales: **50, 200, 500, 1000** jobs in RAM per row.

Env: `BENCHMARK_JOB_SCALES=50,200,500,1000`

## `make benchmark-ray` (Ray + RayWatch)

Default scales: **10, 25, 50** jobs submitted on the **real** cluster (cumulative history).

| Safety cap | Default |
|------------|---------|
| `BENCHMARK_RAY_MAX_JOBS` | **100** (max submission_id jobs on Ray during benchmark) |

RayWatch columns at the same scales still use in-memory seed (not Ray’s full history size).

## Demo cluster (`scripts/demo_occupied_ray.sh`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `DEMO_RAY_JOBS` | **6** | Extra quick `python -c pass` style jobs |
| Plus fixed | **3** | tasks-heavy, failing (logs), long-running (live tail) |

Not a load test — safe for a laptop. For more history without load, raise `DEMO_RAY_JOBS` to **20–30** only if Docker has RAM.

Report file: `benchmark-results/jobs-list-latency.md` (updated by `make perf` and `make benchmark`).
