# Ray Dashboard parity (living tracker)

**Goal:** RayWatch matches Ray Dashboard on every operator-facing capability (or is acceptably close). **Warm** read paths should beat the dashboard where we measure latency; **cold** first-byte paths may tie or lag slightly while caches and connections warm.

This doc is the completion checklist for the long-running product goal. Update rows as features ship.

## How we measure “beat the dashboard”

| Layer | Command | What “warm” means |
|-------|---------|-------------------|
| RayWatch API | `make perf` | `PERF_WARMUP=0` — regression gate p95 includes cold first sample (honest worst case). |
| RayWatch vs Ray jobs API | `make benchmark` / `make benchmark-ray` | Table in `benchmark-results/jobs-list-latency.md`: **cold** = first timed sample; **warm p95** = p95 after `BENCHMARK_WARMUP` discarded iterations (still fresh HTTP client per sample — server/index hot, not keep-alive cheating). |
| UI | Manual + future Playwright | Subjective parity; latency NFRs in [non-functional-requirements.md](./non-functional-requirements.md). |

**Success criteria (jobs hub — first vertical slice):**

- Feature parity rows below marked **done** or **close** for v1 scope in [frontend-features.md](./frontend-features.md).
- At scales in [benchmark-scales.md](./benchmark-scales.md), RayWatch **warm p95** ≤ Ray dashboard **warm p95** on `GET /jobs` equivalent when `make benchmark-ray` runs.
- Cold RayWatch list may exceed Ray; document deltas in the benchmark table, do not hide them.

## Feature matrix (Ray Dashboard → RayWatch)

Legend: **done** · **partial** · **gap** · **n/a** (RayWatch deliberate scope)

### Jobs & actions

| Ray Dashboard capability | RayWatch | Status | Notes |
|--------------------------|----------|--------|-------|
| Job list (status, id, entrypoint, timing) | `GET /jobs` + jobs table | **done** | Cursor pagination; URL-persisted search; **1h / 24h / 7d** time presets; per-column filters; submission vs internal kind |
| Job detail / status | `GET /jobs/{id}` | **done** | Sync honesty fields |
| Stop / terminate job | `POST /jobs/{id}/stop` | **done** | Best-effort Ray HTTP |
| Submit job from UI | — | **n/a** | Ops view; use Ray CLI/SDK |
| Driver logs (job) | `GET /jobs/{id}/logs` + LogViewer | **close** | UI tails ~400 lines then `after_offset` poll; short server log-body cache on poll; WS-triggered tail; filters; `?log_line=` links |
| Task list / nested tasks | `GET /jobs/{id}/tasks` + task tree | **close** | **Nested runs** on job detail; `/internal-runs` hub; cursor + “Load more”; WS `tasks_preview` |

### Tasks & entities

| Ray Dashboard capability | RayWatch | Status | Notes |
|--------------------------|----------|--------|-------|
| Task detail | `GET /tasks/{id}` + task drawer/page | **partial** | Shared `TaskInspector` + attempt timeline |
| Worker / node drill-down | Worker card + actor card + cluster links | **partial** | Actor → node one-hop from live index |
| Actors, objects, global state browser | `GET /cluster/actors` + **`/actors`** + objects on `/cluster` | **close** | Dedicated **Actors** nav tab; objects on cluster; palette links; not full lineage browser |
| Metrics / charts / GPU views | Utilization bars + sync-history sparklines | **close** | Recent trend (~4 min); not full Grafana |

### Live & freshness

| Ray Dashboard capability | RayWatch | Status | Notes |
|--------------------------|----------|--------|-------|
| Auto-refresh job list | Sync loop + TanStack Query | **done** | |
| Stale / disconnected indicator | Sync banner + `/freshness` | **done** | |
| WebSocket live patches | `WS /ws/live` | **partial** | Hub `jobs_preview`; job scope sends `job` + `tasks_preview` |
| Manual resync | `POST /sync/trigger` | **done** | |

### Search & navigation

| Ray Dashboard capability | RayWatch | Status | Notes |
|--------------------------|----------|--------|-------|
| Global search by id | `GET /search` + command palette | **close** | v1: jobs, tasks, actors, nodes by id/name; no object ref search |
| Deep links | React routes | **done** | `/jobs/:id`, tasks |
| Breadcrumbs | Shared `Breadcrumbs` + job/task/cluster trails | **done** | Jobs → entrypoint/job → task name |

### Cluster-level (Ray “Overview”)

| Ray Dashboard capability | RayWatch | Status | Notes |
|--------------------------|----------|--------|-------|
| Cluster status, nodes, resources | `/cluster` + `GET /cluster/overview` | **close** | Totals + utilization bars + sparklines; nodes + objects tables (actors moved to `/actors`) |
| Serve / Train dashboards | — | **n/a** | Separate products |

## API coverage map (tests)

Contract and behavior tests should stay aligned with this list. Primary file: `tests/unit/test_api_routes_complete.py`.

| Endpoint | Contract tests | Perf / benchmark |
|----------|----------------|------------------|
| `GET /health`, `GET /ready` | yes | — |
| `GET /jobs`, `GET /jobs/{id}` | yes | `make perf`, `make benchmark` |
| `GET /jobs/{id}/tasks` | yes | — |
| `GET /jobs/{id}/logs` | yes | integration demo logs |
| `POST /jobs/{id}/stop` | yes | — |
| `GET /freshness`, `POST /sync/trigger` | yes | — |
| `GET /search` | yes | — |
| `WS /ws/live` | yes | — |
| `GET /tasks/{id}` | yes | — |
| `GET /cluster/overview`, `GET /cluster/nodes`, `GET /cluster/actors`, `GET /cluster/objects` | yes | — |

## v1 boundary (not full Ray dashboard)

RayWatch v1 omits **historical metrics charts** (Grafana-style) and **multi-hop object lineage** (see [frontend-features.md](./frontend-features.md) “Explicitly not in frontend v1”). Everything else in the matrix above targets **done** or **close** for operator workflows (jobs, tasks, logs, cluster entities, search, live sync).

## Evidence (live Ray, 2026-10-14)

- `make verify-live` — integration tests, task-indexed demo job, logs curl, **warm p95 beats Ray** at scales 10/25 (`benchmark-results/jobs-list-latency.md`).
- CI: `.github/workflows/verify-live.yml` (nightly + manual) runs the same script when Docker is available.

## Next engineering priorities (parity order)

1. **Object browser / metrics charts** — explicit **gap** vs full Ray dashboard; not in [frontend-features.md](./frontend-features.md) v1.
2. **Task tree on huge clusters** — paginated task API exists; UI lazy-load for very deep trees.
3. **Log WS chunks** — optional; HTTP incremental tail + sync-triggered tail is v1.
4. **Playwright on live Ray** — e2e still uses fixture API; add optional live job smoke behind env flag.

## Related

- [frontend-features.md](./frontend-features.md) — detailed UI v1 checklist  
- [benchmark-scales.md](./benchmark-scales.md) — job counts and caps  
- [perf-testing.md](./perf-testing.md) — regression discipline  
- [MVP-DELIVERY.md](./MVP-DELIVERY.md) — what shipped first  
