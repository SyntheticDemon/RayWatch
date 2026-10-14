# Performance improvement log

One section per optimization **layer**. Always record commands run and outcomes.

---

## Step 0 — Baseline harness (suite design)

**Change:** Added `tests/perf/` + `tests/support/perf_harness.py`, `docs/perf-testing.md`, `make perf` / `make perf-baseline`. Split **correctness** (`make test`, `tests/unit/test_live_cache_jobs.py`) from **regression** (`make perf`). Removed unfinished Postgres `job_snapshot` code (still ADR 0003 deferred).

**Commands:** `make test` (17 passed), `make perf` (1 passed).

**Read-path p95 (ms) after harness — baselines committed:**

| scenario | jobs | p95 (ms) |
| --- | ---: | ---: |
| jobs_list_1000 | 1000 | 1.73 |
| jobs_list_5000 | 5000 | 0.91 |
| jobs_list_10000 | 10000 | 1.26 |
| job_get_5000 | 5000 | 0.82 |

**Ray vs RayWatch:** `make benchmark-ray` (informational; `BENCHMARK_RAY_MAX_JOBS=100` default).

---

## Step 1 — Sorted job index in `LiveCache`

**Change:** `job_ids_sorted` maintained on upsert/remove; full rebuild when a single ingest batch touches >64 jobs.

**Commands:** `make test`, `make perf`.

**Note:** Step 1 code landed with Step 0; re-run `make perf` after the next layer to see a delta vs `tests/perf/baselines.json`.

**Next layer candidates:** task list index, ingest batch sizing, Ray comparison at safe scales only.

---

## Step 2 — Default `GET /jobs` fast path in `LiveCache`

**Change:** When there are no filters and `sort=job_id`, paginate `job_ids_sorted` in place (no full-id copy or redundant sort). Build rows with `JobSummary.model_validate` instead of `model_dump` round-trip.

**Commands:** `make test`, `make perf`, `make perf-baseline` (refreshed `tests/perf/baselines.json`).

**Read-path gate p95 (ms) after Step 2:**

| scenario | jobs | gate p95 (ms) |
| --- | ---: | ---: |
| jobs_list_1000 | 1000 | ~1.9 |
| jobs_list_5000 | 5000 | ~1.9 |
| jobs_list_10000 | 10000 | ~1.8 |
