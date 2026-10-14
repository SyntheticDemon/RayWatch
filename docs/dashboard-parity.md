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
| Job list (status, id, entrypoint, timing) | `GET /jobs` + jobs table | **done** | Cursor pagination, filters, `include_archived` |
| Job detail / status | `GET /jobs/{id}` | **done** | Sync honesty fields |
| Stop / terminate job | `POST /jobs/{id}/stop` | **done** | Best-effort Ray HTTP |
| Submit job from UI | — | **n/a** | Ops view; use Ray CLI/SDK |
| Driver logs (job) | `GET /jobs/{id}/logs` + LogViewer | **partial** | `tail_lines` / `after_offset` incremental tail; WS + poll append; download |
| Task list / nested tasks | `GET /jobs/{id}/tasks` + task tree | **partial** | Live Ray ingest + incremental remove when task page is complete |

### Tasks & entities

| Ray Dashboard capability | RayWatch | Status | Notes |
|--------------------------|----------|--------|-------|
| Task detail | `GET /tasks/{id}` + task drawer/page | **partial** | Shared `TaskInspector` + attempt timeline |
| Worker / node drill-down | Worker card + actor card + cluster links | **partial** | Actor → node one-hop from live index |
| Actors, objects, global state browser | `GET /cluster/actors` + search | **partial** | No full object browser |
| Metrics / charts / GPU views | — | **gap** | Out of v1; not blocking jobs hub |

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
| Global search by id | `GET /search` + command palette | **partial** | Jobs, tasks, actors, nodes; ⌘K nav shortcuts; cluster row highlight |
| Deep links | React routes | **done** | `/jobs/:id`, tasks |
| Breadcrumbs | Shared `Breadcrumbs` + job/task/cluster trails | **done** | Jobs → entrypoint/job → task name |

### Cluster-level (Ray “Overview”)

| Ray Dashboard capability | RayWatch | Status | Notes |
|--------------------------|----------|--------|-------|
| Cluster status, nodes, resources | `/cluster` + `GET /cluster/overview` | **partial** | CPU/GPU/memory totals + node table; no utilization charts |
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
| `GET /cluster/overview`, `GET /cluster/nodes`, `GET /cluster/actors` | yes | — |

## Next engineering priorities (parity order)

1. **Warm benchmark column** — published in `jobs-list-latency.md`; gate with `make benchmark-ray-assert` when Ray head is up.
2. **Live task ingest** — close task tree gap vs dashboard on real clusters (`M2` in [mvp-scope.md](./mvp-scope.md)).
3. **Log tail UX** — optional WS log chunks; today sync-triggered HTTP tail + poll.
4. **Utilization charts / object browser** — Ray metrics and global state remain out of v1 scope unless product expands.
5. **CI verify-live** — optional nightly `make verify-live` when Docker Ray is available.

## Related

- [frontend-features.md](./frontend-features.md) — detailed UI v1 checklist  
- [benchmark-scales.md](./benchmark-scales.md) — job counts and caps  
- [perf-testing.md](./perf-testing.md) — regression discipline  
- [MVP-DELIVERY.md](./MVP-DELIVERY.md) — what shipped first  
