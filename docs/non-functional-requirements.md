# Non-functional requirements (NFRs)

Targets for RayWatch as an **ops dashboard** over Ray—not hard SLAs until we measure in production. Use these for design review, ADRs, and acceptance tests where measurable.

## Performance

| ID | Requirement | Target (initial) | Notes |
|----|-------------|------------------|--------|
| P1 | **Entity lookup API** (`GET /tasks/{id}`, expand one hop) | p95 &lt; **100 ms** on indexed data | Must not call Ray State API per click. |
| P2 | **Jobs list** (cursor + filter) | p95 &lt; **200 ms** per page (≤ 100 rows) | Never load full job set into browser; search/index server-side. |
| P3 | **Ingestion lag** (Ray state → index) | p95 &lt; **5 s** under normal load | Dominated by Ray APIs; document when polling. |
| P4 | **WebSocket patch** after index update | p95 &lt; **500 ms** after ingest | User viewing an open job/task. |
| P5 | **Log tail** (scoped job/task) | First byte &lt; **2 s**; streaming thereafter | Depends on Ray log plumbing. |
| P6 | **UI** | No single view renders &gt; **500** task rows without virtualization | Hard cap in API `limit` + virtual scroll. |

**Out of scope for v1:** sub-10 ms API at millions of QPS; RayWatch is operator-scale, not public internet scale.

## Scalability

| ID | Requirement | Target | Notes |
|----|-------------|--------|--------|
| S1 | **Jobs in system** (active + completed, searchable) | **100k+** job records | Job **metadata** in indexed/historical store; UI always cursor-paginated. |
| S1b | **Concurrent running jobs** | **10k+** without hub degradation | Hub defaults to *running / recent* views; counts and filters backed by indexes, not full scans. |
| S2 | **Tasks per job** (active + recent in hot store) | **100k+** with aggregation drill-down | Completed tasks evicted to historical per retention policy. |
| S3 | **Cluster size** | Typical **10–500** nodes without architectural change | Collector poll budget scales with entity counts. |
| S4 | **Memory (API + collector)** | Configurable **retention**; document RAM vs job/task count | No unbounded growth on completed work in live index. |
| S5 | **Horizontal scale** | **Single collector per Ray cluster** v1 | Multi-replica API read-only later; single writer to index. |

## Availability & reliability

| ID | Requirement | Target | Notes |
|----|-------------|--------|--------|
| A1 | **RayWatch restart** | Reconnect + **full snapshot** within **2 min** for medium cluster | No claim of zero downtime during Ray head failover. |
| A2 | **Ray head unavailable** | API serves **last known** state + clear **stale** indicator | No silent pretend-live. |
| A3 | **Collector crash** | API read-only on last snapshot until collector healthy | Optional watchdog restart (K8s/systemd). |
| A4 | **Ray cluster reset** | **Historical** store retains ingested jobs/tasks/transitions; UI labels archived vs live | Ray State API may be empty after reset; RayWatch is system of record for history. |
| A4b | **RayWatch restart** | Rebuild **live** from Ray snapshot; **history** from disk | Postgres/SQLite required for production history use case. |
| A5 | **Action failures** | User sees **explicit error** + idempotent retry where Ray allows | No “success” UI if Ray rejected stop. |

## Security

| ID | Requirement | Notes |
|----|-------------|--------|
| SEC1 | **No direct browser → Ray** | All access via RayWatch API; Ray address/credentials server-side only. |
| SEC2 | **Authentication** | v1: optional **reverse-proxy auth** (OAuth2 proxy, mTLS); native auth ADR before multi-tenant. |
| SEC3 | **Authorization for actions** | Destructive ops (stop/kill) require authenticated role; **audit log** (who, what, when, outcome). |
| SEC4 | **No automatic actor introspection** | Optional diagnostic hooks only; never dump arbitrary Python object graphs. |
| SEC5 | **Secrets** | No credentials in logs or WS payloads; env/config for Ray token. |
| SEC6 | **TLS** | TLS in production between user↔RayWatch and RayWatch↔Ray when supported. |
| SEC7 | **CLI console** | Auth required; role-based allowlist; full session audit; idle timeout; no client-side Ray credentials. |

## Observability (RayWatch itself)

| ID | Requirement | Notes |
|----|-------------|--------|
| O1 | **Structured logs** | structlog; correlation id per request. |
| O2 | **Metrics** | Prometheus-friendly: ingest lag, index size, API latency, Ray poll errors, WS connections. |
| O3 | **Health** | `GET /health` (process up), `GET /ready` (collector synced at least once). |
| O4 | **Tracing** | OpenTelemetry optional on API and collector HTTP to Ray. |

## Operability & deployment

| ID | Requirement | Notes |
|----|-------------|--------|
| D1 | **Single-cluster deployment** | One RayWatch instance per Ray cluster v1. |
| D2 | **Configuration** | Ray address, poll intervals, retention, auth—**env + config file**; documented. |
| D3 | **Upgrade** | Semver; migration notes for canonical model schema versions. |
| D4 | **Supported Ray** | Explicit **version range** in docs; CI matrix on those minors. |
| D5 | **Resource footprint** | Document minimum CPU/RAM for dev vs prod collector. |

## Usability & accessibility

| ID | Requirement | Notes |
|----|-------------|--------|
| U1 | **Dark mode default** | Readable contrast (WCAG **AA** target for text/UI). |
| U2 | **Primary flows** | Jobs list → job → task → logs in **≤ 4** interactions from search. |
| U3 | **Destructive actions** | Confirm dialog; show job/task id in confirmation. |
| U4 | **Stale / degraded** | Banner when ingestion paused or data older than threshold. |
| U5 | **Keyboard** | Search/command palette reachable by keyboard. |

## Job retention

| ID | Requirement | Notes |
|----|-------------|--------|
| R1 | **Complete job bundle** | Persist full job record per [job-retention-requirements.md](./job-retention-requirements.md)—tasks, attempts, transitions, logs, lineage, actions—not hub-only summaries. |
| R2 | **Queryable after Ray reset** | Historical job id opens same inspector from durable store. |
| R3 | **Export** | Download job bundle (JSON ± logs) for support and compliance. |

## Docker and dev kit

| ID | Requirement | Notes |
|----|-------------|--------|
| DK1 | **Container images** for api, collector, web (or documented all-in-one). |
| DK2 | **docker compose** dev stack: Ray + RayWatch + Postgres in one command. |
| DK3 | **CI compose** profile runs integration tests; same as documented contributor path. |
| DK4 | **`make test`** (or equivalent) runs fast suite locally without manual setup. |

Details: [docker-and-devkit.md](./docker-and-devkit.md).

## Maintainability

| ID | Requirement | Notes |
|----|-------------|--------|
| M1 | **RuntimeAdapter boundary** | Ray API changes isolated to adapter; golden tests required for format changes. |
| M2 | **OpenAPI** | Public API documented; breaking changes only on major semver. |
| M3 | **Test pyramid** | See [testing.md](./testing.md); PRs must pass unit + contract; integration on main/nightly as configured. |

## Compatibility

| ID | Requirement | Notes |
|----|-------------|--------|
| C1 | **Browsers** | Last two versions of Chrome, Firefox, Safari, Edge. |
| C2 | **Python** | 3.12+ (3.13 recommended); pinned in `pyproject.toml`. |

## Future NFRs (explicitly later)

- Multi-cluster UI and federated search  
- HA active-active collectors  
- Fine-grained RBAC per Ray job namespace  
- Formal SLO/error budgets for hosted offerings  

## Feature ↔ NFR mapping

Per-feature NFR gates and gaps: [ray-dashboard-feature-matrix.md](./ray-dashboard-feature-matrix.md) (section **NFR coverage map**). Target: every operator feature has live E2E + NFR where measurable.

## Related

- [architecture.md](./architecture.md)  
- [testing.md](./testing.md)  
- [product-vision.md](./product-vision.md)  
- [ray-dashboard-feature-matrix.md](./ray-dashboard-feature-matrix.md)  
