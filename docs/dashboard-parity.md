# Ray Dashboard parity (summary)

**Full matrix (features × tests × NFR):** [ray-dashboard-feature-matrix.md](./ray-dashboard-feature-matrix.md)  
**Upstream reference:** Ray `2.59.0` [`App.tsx`](https://github.com/ray-project/ray/blob/ray-2.59.0/python/ray/dashboard/client/src/App.tsx).

**Goal:** Complete, efficient operator dashboard. Warm read paths should beat Ray on measured HTTP equivalents (`make benchmark-ray`). Every shipped feature gets **live Ray E2E** + an **NFR** row when measurable.

## Status snapshot

| Area | Status |
|------|--------|
| Jobs hub, detail, stop, logs (basic) | **partial** — live e2e covers hub, 1h filter, stop, logs |
| Tasks, nested runs, internal jobs | **partial** — fixture e2e; live e2e pending |
| Actors, cluster, objects | **partial** — fixture e2e only |
| Metrics, Serve, global logs, overview | **gap** / **n/a** (Serve) |
| Live sync, honesty, manual sync | **done** / **partial** (WS) |

## How we measure

| Layer | Command |
|-------|---------|
| RayWatch API regression | `make perf` |
| RayWatch vs Ray jobs API | `make benchmark` / `make benchmark-ray` |
| Live stack + integration | `make verify-live` |
| Live UI E2E | `make test-e2e` |
| Full NFR gate (target) | `make ci-live` |

Details: [perf-testing.md](./perf-testing.md), [benchmark-scales.md](./benchmark-scales.md).

## API endpoints (contract tests)

See matrix doc for per-feature test columns. Contract baseline: `tests/unit/test_api_routes_complete.py`.

## Related

- [ray-dashboard-feature-matrix.md](./ray-dashboard-feature-matrix.md) — **primary tracker**  
- [frontend-features.md](./frontend-features.md)  
- [MVP-DELIVERY.md](./MVP-DELIVERY.md) (historical; some rows outdated)  
