# RayWatch

**Ray Dashboard parity layer** for [Ray](https://www.ray.io/)—Overview, Jobs, Actors, Tasks, Cluster, logs, and actions. Ray feeds an **ingest funnel** into a **durable store** (Postgres); the API serves a **fast in-memory projection** loaded from that store. See [ADR 0005](docs/adr/0005-database-source-of-truth.md).

## Beyond the Ray Dashboard

The Ray Dashboard (port `8265`) shows what the Ray head still has in memory. RayWatch sits beside it and adds the following. Parity gaps (Grafana, Serve, global logs) stay in the [feature matrix](docs/ray-dashboard-feature-matrix.md).

| Extra | What you get today |
|-------|--------------------|
| **History after Ray drops a job** | On removal from Ray, an optional snapshot (Postgres `job_snapshot` or a JSON directory) keeps the job. The jobs hub **Include archived** toggle (`include_archived`) lists it after the State API no longer does. Full task history after restart is still open ([#9](https://github.com/SyntheticDemon/RayWatch/issues/9)). |
| **Internal runs** | `/internal-runs` lists Ray driver and internal job ids. The main jobs hub stays on submission jobs. |
| **Freshness you can read** | API responses carry `sync` (lag, Ray reachability, cluster epoch). The UI shows **Live / Polling**, milliseconds behind, and **Cluster unreachable** or **Out of date**. |
| **Indexed reads** | Jobs list, nested progress, and search are served from `LiveCache`. Expanding a job builds the child-run tree locally (`GET /jobs/{id}/nested-progress`) with no extra Ray HTTP call. |
| **Inline nested progress** | On the jobs hub, expand a row for child runs and a progress bar (running / finished / failed / pending) from that local tree. |
| **Cross-entity jump (⌘K)** | `GET /search` matches jobs, tasks, actors, nodes, and objects by id or name, and archived jobs when snapshots are on. The match is a substring of those fields. |
| **Stop a job from the job page** | **Stop job** asks you to confirm, then `POST /jobs/{id}/stop` calls Ray (the submission id when that is the Ray id) and reads the job back. The banner says the job is stopped, or that Ray accepted the request and the job is still running. |
| **Kill an actor from the drawer** | On a live actor, **Kill** asks you to confirm, then `POST /actors/{id}/kill`. The drawer shows Ray’s result. |
| **One process beside the head** | `raywatch serve` runs the API, background ingest, and the UI. The browser talks only to RayWatch. Ray stays at `:8265`. |
| **Submit → visible measurement** | `make test-ingest-gate` checks that a submitted job shows up in the API and the UI, and writes [benchmark-results/ingest-visibility.md](benchmark-results/ingest-visibility.md). |

Search by the meaning of an error or a log line is tracked in [#39](https://github.com/SyntheticDemon/RayWatch/issues/39).

**Status:** 0.1.x (alpha).

See [what is included](docs/MVP-DELIVERY.md), the [Ray Dashboard comparison](docs/ray-dashboard-feature-matrix.md), and [known limitations](docs/known-challenges.md).

**License:** [Apache-2.0](LICENSE). RayWatch is independent of Anyscale; see [NOTICE](NOTICE).

## Security & deployment

RayWatch has **no built-in login** in v1. Anyone who can reach the API can trigger **stop job** and **kill actor** (same class of risk as an unprotected Ray dashboard).

- **Development:** use `raywatch serve` on **localhost** (default bind).
- **Shared or production:** terminate TLS at a reverse proxy, add **OAuth2 proxy / mTLS / VPN**, and keep Ray credentials in **server env only** (`RAY_DASHBOARD_URL`, tokens)—never in the browser.
- **Do not** expose ports `3000` / `8080` on the public internet without auth.

Report vulnerabilities privately: [SECURITY.md](SECURITY.md). Roadmap: [#25](https://github.com/SyntheticDemon/RayWatch/issues/25) (auth + audit).

## Repo layout

```
packages/model/          # Canonical Pydantic types + API DTOs
packages/engine/         # LiveCache indexes, ingest apply, snapshots, WS hub
packages/adapter-ray/    # Ray HTTP client + normalize pipelines
packages/cli/            # `raywatch serve|stop|sync|clean`
services/collector/      # `sync_active_jobs` (imported by API today)
services/api/            # FastAPI HTTP + WebSockets + embedded sync loop
apps/web/                # Vite + React UI
compose/                 # Ray head, Postgres, API image (collector/web optional)
tests/                   # unit, perf, integration, Playwright e2e
docs/                    # design docs
```

## Prerequisites

- [uv](https://github.com/astral-sh/uv) (Python 3.12+)
- Docker (integration / full stack)
- Node 22+ (frontend)

## Quick start

```bash
make install
make test
```

**One app** — API, background Ray sync, and web UI:

```bash
uv run raywatch serve              # foreground UI (Ctrl+C stops API)
uv run raywatch serve --detach     # same as `make dev`
uv run raywatch stop               # stop API, UI, and local Ray
```

Remote Ray head (no local Docker Ray):

```bash
uv run raywatch serve --detach --remote http://YOUR_HEAD:8265 --fresh
```

Fixture-only (no Ray):

```bash
uv run raywatch serve --fixture --detach
```

Maintenance (optional; sync also runs automatically inside the API):

```bash
uv run raywatch sync               # trigger poll against running API
uv run raywatch sync --fixture     # reload fixture index locally
uv run raywatch clean              # wipe local .dev scratch / snapshots
```

| URL | Purpose |
|-----|---------|
| http://127.0.0.1:3000/jobs | RayWatch jobs hub |
| http://127.0.0.1:8265/#/jobs | Ray Dashboard (local stack) |

`OPEN_BROWSER=0` disables auto-open. `raywatch serve --jobs 30` submits more demo jobs on local Ray.

## Testing ingest visibility (submit → dashboard)

Requires **Docker** only (`make ray-up` pulls Ray). One command runs Python gates, scale benchmark, and Playwright UI:

```bash
make test-ingest-gate
```

Report: [benchmark-results/ingest-visibility.md](benchmark-results/ingest-visibility.md). Same Python gate runs in CI `e2e-live` before Playwright; nightly `make verify-live` adds scale asserts.

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Coding standards](docs/coding-standards.md)

Track live-cluster gaps and parity work on [GitHub Issues](https://github.com/SyntheticDemon/RayWatch/issues).
