# Ray Dashboard feature matrix (Ray 2.59 → RayWatch)

**Source of truth (upstream UI):** Ray `2.59.0` dashboard client routes in  
[`python/ray/dashboard/client/src/App.tsx`](https://github.com/ray-project/ray/blob/ray-2.59.0/python/ray/dashboard/client/src/App.tsx)  
and observability docs: [Ray Dashboard views](https://docs.ray.io/en/latest/ray-observability/getting-started.html).

**RayWatch goal:** Complete, efficient operator dashboard — feature parity where Ray exposes public HTTP/State APIs; deliberate **n/a** only for Serve/Train/submit-job flows.

**Test layers (target for every row):**

| Column | Meaning |
|--------|---------|
| **Live E2E** | `make test-e2e` → `apps/web/e2e/live/*` on Docker Ray |
| **Fixture E2E** | `make test-e2e-fixture` → `apps/web/e2e/fixture/*` (UI-only, no Ray) |
| **Integration** | `make test-integration-ray` / `tests/integration/*` |
| **NFR** | `make perf`, `make benchmark-ray`, or dedicated NFR test (latency / honesty / scale) |

Legend: **done** · **partial** · **gap** · **planned** · **n/a**

---

## Navigation & shell

| Ray Dashboard (route) | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------------|----------|--------|----------|-------------|-------------|-----|
| Main nav (Overview, Jobs, Actors, Cluster, Metrics, Serve, Logs) | Overview, Jobs, Actors, Cluster, Internal runs | **partial** | overview-cluster | navigation | — | — |
| Overview `/overview` | `/overview` summary cards | **partial** | overview-cluster | — | — | `cluster_overview` perf |
| Token / k8s auth dialog | — | **n/a** | — | — | — | SEC2 proxy |
| Light/dark theme toggle | dark default only | **gap** | — | — | — | U1 |
| Timezone / session context | — | **gap** | — | — | — | — |
| Platform events `/platform-events` | — | **gap** | — | — | — | — |

---

## Jobs (`/jobs`, `/jobs/:id/*`)

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Job list (active/finished/failed) | `GET /jobs` + hub `/` | **partial** | jobs-hub | jobs-hub | test_ray_live | **P2** `make perf`, `benchmark-ray` |
| Job detail info tab | `/jobs/:id` | **partial** | — | job-detail breadcrumbs | test_live_api_tasks | **P1** job get perf |
| Job charts tab | — | **gap** | — | — | — | metrics gap |
| Job actors tab | nested runs / tasks only | **gap** | — | nested-runs | partial tasks | — |
| Task/Actor breakdown (nested, by state) | Task tree + status badges | **partial** | — | nested-runs, task-detail | test_live_api_tasks | — |
| Task timeline (worker/node rows) | Task attempt timeline | **partial** | — | task-detail | — | — |
| Placement group table | — | **gap** | — | — | — | — |
| Stop / cancel job | `POST /jobs/{id}/stop` | **partial** | stop-and-logs | job-detail stop | — | — |
| Submit job from UI | — | **n/a** | — | — | — | — |
| Job driver logs | logs panel + `GET/WS` logs | **partial** | stop-and-logs | job-detail logs | test_demo_logs_flow | **P5** planned |
| Pagination / filters / search | URL filters, column filters, ⌘K | **partial** | jobs-hub (time) | jobs-hub-workflow | jobs filter unit | P2 list |
| Time range (1h/24h/7d) | presets + API `started_after` | **partial** | jobs-hub 1h | URL only (fixture dates) | — | — |
| Internal / driver jobs | `/internal-runs`, `job_kind` | **done** | — | nested-runs, workflow | internal workflow unit | — |

---

## Tasks (`/jobs/.../tasks/:taskId`, global task routes)

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Task detail page | `/tasks/:id` + drawer | **partial** | — | task-detail | test_live_api_tasks | **P1** |
| Task events / attempts | TaskInspector + timeline | **partial** | — | task-detail | — | — |
| Task-scoped logs | LogViewer + filter | **partial** | — | job-detail | — | P5 |
| Parent/child task graph | Task tree, child links | **partial** | — | nested-runs | — | — |
| Object refs in/out | metadata links only | **gap** | — | — | — | — |

---

## Actors (`/actors`, `/actors/:actorId`)

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Actor list | `/actors`, `GET /cluster/actors` | **partial** | — | actors | test_ray_live | — |
| Actor detail (state, pid, worker) | Actor card / links | **partial** | — | — | — | — |
| Actor logs | — | **gap** | — | — | — | P5 |
| Kill actor | — | **gap** | — | — | — | SEC3 |
| Link worker → actor (cluster view) | partial cluster links | **gap** | — | — | — | — |

---

## Cluster (`/cluster`, `/cluster/nodes/:id`)

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Cluster hierarchy (nodes → workers) | nodes table | **partial** | overview-cluster | cluster | test_ray_live | — |
| Node detail page | `/cluster/nodes/:id` | **partial** | overview-cluster | — | GET `/cluster/nodes/{id}` | — |
| Cluster info / autoscaler hints | overview bars | **partial** | — | cluster | — | — |
| GPU/TPU columns | — | **gap** | — | — | — | — |
| Resource utilization | utilization bars + sparklines | **partial** | — | cluster | — | — |
| Objects / memory store browser | objects table on `/cluster` | **partial** | — | cluster | — | — |

---

## Logs (`/logs`, job log viewer)

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Global log index / viewer | job-scoped only | **gap** | — | — | — | — |
| State API log list | — | **gap** | — | — | — | — |
| Tail / stream | `WS /ws/job-logs`, HTTP tail | **partial** | stop-and-logs | job-detail | test_demo_logs_flow | P5 |
| Level filter, copy line, pause | LogViewer toolbar | **partial** | — | job-detail | — | — |

---

## Metrics (`/metrics`)

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Embedded Grafana dashboards | sparklines only | **gap** | — | — | — | — |
| Prometheus health / datasource | — | **gap** | — | — | — | O2 |
| Task/actor CPU memory charts | — | **gap** | — | — | — | — |

---

## Serve (`/serve/*`)

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Deployments, replicas, system actors | — | **n/a** | — | — | — | — |

---

## Live sync & honesty

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Auto-refresh lists | sync loop + query | **done** | — | — | test_sync_honesty | P3 ingest lag planned |
| Stale / disconnected UI | sync banner, `/freshness` | **done** | — | — | nfr sync honesty | A2 |
| WebSocket updates | `WS /ws/live` | **partial** | — | — | ws unit | **P4** planned |
| Manual refresh | Sync button, `POST /sync/trigger` | **done** | stop-and-logs | — | — | — |

---

## Search & CLI

| Ray capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|----------------|----------|--------|----------|-------------|-------------|-----|
| Global id search | `GET /search`, ⌘K palette | **partial** | — | command-palette | search unit | — |
| Object ref search | — | **gap** | — | — | — | — |
| `/cmd/:cmd/:ip/:pid` | — | **gap** | — | — | — | SEC7 |

---

## Durability & history (RayWatch product, not Ray UI)

| Capability | RayWatch | Status | Live E2E | Fixture E2E | Integration | NFR |
|------------|----------|--------|----------|-------------|-------------|-----|
| Survive RayWatch restart | optional snapshot store | **gap** | — | — | snapshot unit | A4b, R1 |
| Archived jobs in hub | `include_archived` | **partial** | — | — | archived api unit | R2 |
| Job bundle export | — | **gap** | — | — | — | R3 |

---

## NFR coverage map (final gate — expand until full)

| NFR ID | Requirement | Features covered today | Gap |
|--------|-------------|------------------------|-----|
| **P1** | Task/job get p95 &lt; 100 ms | job get, task get, job tasks | `test_read_paths_extended`, `task_get_1000` perf |
| **P2** | Jobs list p95 &lt; 200 ms | jobs hub | filtered list perf; live Ray scale |
| **P3** | Ingest lag p95 &lt; 5 s | sync loop | `test_ingest_lag_live` (integration) |
| **P4** | WS patch &lt; 500 ms | job/task live | e2e + timing test |
| **P5** | Log first byte &lt; 2 s | job logs | `test_job_logs_latency`, `test_ingest_lag_live` logs; `job_logs_cached` perf |
| **P6** | No &gt;500 task rows unvirtualized | task tree | deep tree e2e |
| **A2** | Stale indicator | banner | live e2e Ray down |
| **benchmark-ray** | RW warm ≤ Ray jobs API | jobs list | tasks/actors/logs endpoints |

**Commands:** `make perf` · `make benchmark-ray-assert` · `make parity-gate` (perf + assert + verify-live + live e2e) · `make ci-live`

---

## Implementation backlog (priority order)

Work test-driven: add **live E2E** first, then **integration**, then **NFR** row for that feature.

1. **Overview page** — **partial** (`/overview`); add failed/running job breakdown, link to metrics.
2. **Node detail** — **partial** (`/cluster/nodes/:id`); add worker rows + actor links (Ray `NodeRow`).
3. **Job detail parity** — tabs: Info (done), Tasks (partial), Logs (harden live WS), Charts (defer or embed metrics).
4. **Global logs view** — Ray `/logs` equivalent: pick job/task, tail stream; adapter for State API log index if available.
5. **Actor detail + actor logs** — `/actors/:id` page; kill actor behind auth.
6. **Object browser** — drill-down from object ref; lineage one hop.
7. **Metrics** — optional Grafana iframe or native charts for CPU/memory/GPU.
8. **WS hub parity** — `jobs_preview` respects filters; task tree live updates at scale (virtualize + cursor).
9. **Placement groups** — ingest + table on job detail.
10. **Platform events** — only if Ray 2.59 API stable in adapter.
11. **Durability** — Postgres snapshot default in compose; e2e restart survives history.
12. **NFR suite per endpoint** — extend `tests/nfr/` + `benchmark-results/` for tasks list, actors list, log fetch, WS (not only `GET /jobs`).

---

## Test inventory (current)

| Area | Live E2E (`e2e/live/`) | Fixture E2E (`e2e/fixture/`) |
|------|--------------------------|------------------------------|
| Jobs hub | `jobs-hub.spec.ts` | `jobs-hub.spec.ts`, `jobs-hub-workflow.spec.ts` |
| Stop / logs | `stop-and-logs.spec.ts` | `job-detail.spec.ts` |
| Overview / cluster / node | `overview-cluster.spec.ts` | `cluster.spec.ts`, `actors.spec.ts` |
| Tasks | `task-detail.spec.ts` | `task-detail.spec.ts` |
| Nav / palette | `navigation-palette.spec.ts` | `navigation.spec.ts`, `command-palette.spec.ts` |
| Nested / internal | — | `nested-runs.spec.ts` |

**Next live E2E:** WS log stream timing, stale banner when Ray stopped, internal-runs on live cluster, actor detail page.

---

## Related

- [dashboard-parity.md](./dashboard-parity.md) — short summary matrix  
- [frontend-features.md](./frontend-features.md) — RayWatch UI v1 checklist  
- [non-functional-requirements.md](./non-functional-requirements.md) — NFR IDs  
- [testing.md](./testing.md) — how to run live vs fixture e2e  
- [benchmark-scales.md](./benchmark-scales.md) — perf job counts  
