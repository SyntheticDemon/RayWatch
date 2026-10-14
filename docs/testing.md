# Testing strategy

RayWatch is tested in **layers**: pure logic without Ray, contract tests without UI, short **live Ray** smokes in CI, and optional full e2e. Goal: contributors can run **fast tests locally**; CI proves **adapter + engine + API** against a real cluster.

## Test pyramid

```mermaid
flowchart TB
  E2E[Playwright smoke — few]
  INT[Ray-in-Docker integration — some]
  API[HTTP/WS contract tests — moderate]
  UNIT[Model engine adapter unit — many]
```

## 1. Unit tests (no Ray, &lt;30s)

**Packages:** `model`, `engine`, `adapter-ray` (parser only).

| Area | What we assert |
|------|----------------|
| **Normalization** | Raw Ray JSON → canonical entities and edges; golden files under `tests/fixtures/ray/` (one file per Ray minor if shapes differ). |
| **Indexes** | After applying a batch of upserts/deletes, lookups (`task_by_id`, `tasks_by_job`, `children_by_parent`) match expected sets. |
| **Transitions** | Snapshot A → B produces expected timeline events (derive rules). |
| **Control mapping** | Action requests map to correct Ray client calls (mock httpx). |

**Tools:** pytest, pytest-asyncio / anyio, **httpx MockTransport** for adapter HTTP.

**Rule:** Any bug fix for wrong task/attempt identity adds or updates a **fixture + test** so it cannot regress.

## 2. API contract tests (no Ray, mock engine)

FastAPI app mounted with an **in-memory fake engine** preloaded with graph data.

| Check | Method |
|-------|--------|
| OpenAPI shape | Generated schema committed or snapshot-tested |
| Routes | `GET /jobs`, `GET /jobs/{id}/tasks`, `GET /tasks/{id}?expand=`, `POST /jobs/{id}/stop` return expected JSON |
| Errors | 404 unknown id, 409 action failed |
| WebSocket | Subscribe to job channel; inject engine event; client receives patch message |

**Tools:** pytest + **httpx ASGITransport** (async client against app).

Frontend uses the same contract via **MSW** handlers generated from or aligned with OpenAPI.

## 3. Integration tests (real Ray in Docker)

CI job: start **Ray head** in a container (pinned image matching `SUPPORTED_RAY_VERSIONS`), run collector + API (or test harness that drives adapter only).

| Scenario | Pass criteria |
|----------|----------------|
| **Smoke ingest** | `ray.init` + submit trivial `@ray.remote` job; within timeout, job appears in index with ≥1 task |
| **State progression** | Task reaches finished; transition or terminal state recorded |
| **Stop job** | Submit long-running job; `POST stop`; job ends; index reflects terminal state |
| **Logs (if API available)** | Job or task log stream returns non-empty tail for failing task fixture |

**Tools:** pytest markers `@pytest.mark.integration`, **testcontainers** or compose service `ray-head`, generous timeouts, retries only for known flaky Ray startup.

**Matrix:** one Ray minor per supported line (e.g. 2.9, 2.10) — not every patch release.

## 4. End-to-end (optional CI nightly or pre-release)

**Playwright** (`apps/web/e2e/`, `make test-e2e`): `make install-e2e` downloads Chromium if missing; then starts fixture API + `vite preview` automatically (see `playwright.config.ts`). CI runs `npx playwright install chromium --with-deps` before e2e.

| Spec | Covers |
|------|--------|
| `jobs-hub.spec.ts` | Jobs list smoke |
| `jobs-hub-workflow.spec.ts` | Search URL state, job kind, time presets, row → detail |
| `job-detail.spec.ts` | Breadcrumbs, logs toolbar, nested runs heading, stop job |
| `nested-runs.spec.ts` | Task tree expand/select, internal runs page, child tasks on `/tasks/:id` |
| `task-detail.spec.ts` | Standalone task page + job context link |
| `navigation.spec.ts` | Header nav across Jobs / Actors / Cluster / Internal runs |
| `cluster.spec.ts` | Cluster summary, nodes, objects; actors tab |
| `command-palette.spec.ts` | ⌘K navigation to actors and internal runs |
| `use-jobs-hub-filters.test.ts` | Submission vs internal id heuristics (Vitest) |
| `test_internal_job_workflow.py` | API `job_kind=internal` + nested task parent links |

**Live Ray (agent/CI):** `make verify-live` — `ray-up`, `demo-ray`, live API on `:18081`, sync retries until a job has indexed tasks (paginated job list), logs + tasks curl, integration pytest, and warm assert at scales 10/25 (`VERIFY_LIVE_BENCHMARK=0` to skip; `VERIFY_LIVE_REQUIRE_TASKS=0` to allow zero tasks).

CI web job runs `npm run test:e2e` on every PR.

## 5. Non-functional checks

| Check | Where |
|-------|--------|
| **Ruff** lint + format | Every PR |
| **mypy / pyright** on `model`, `adapter-ray`, `api` | Every PR |
| **TypeScript** `tsc` + ESLint on `apps/web` | Every PR |
| **Indexed read SLOs** | `tests/nfr/test_api_latency.py` — p95 thresholds on RayWatch only |
| **Read-path regression** | `make perf` — p95 vs `tests/perf/baselines.json` (+25% and +2.5ms slack); log layers in [perf-improvement-log.md](./perf-improvement-log.md) |
| **API contract (all routes)** | `tests/unit/test_api_routes_complete.py` — pagination, 404s, schema keys, logs error path |
| **Measurement stack** | `tests/unit/test_measurement_stack.py`, `test_measurement_regression_guards.py` — latency stats, perf harness, benchmark helpers |
| **Dashboard comparison (informational)** | `make benchmark` / `make benchmark-ray` — markdown table vs Ray `GET /api/v0/jobs`; `make benchmark-ray-assert` fails if RayWatch warm p95 does not beat Ray (5% slack) |

## Local developer workflow

**Requirement:** A contributor with only Docker + Make clones the repo and runs **`make test`** (unit) and **`make test-integration`** (compose)—no host Ray install. See [docker-and-devkit.md](./docker-and-devkit.md).

```bash
# Fast (default) — host or dev container
make test
# equivalent: uv run pytest -m "not integration"

# Integration — Docker Ray + RayWatch services
make test-integration
# equivalent: docker compose -f compose/docker-compose.ci.yml run --rm test

# Frontend e2e (fixture API + Playwright Chromium)
make test-e2e

# Live Ray + API logs smoke (Docker; ~30s)
make verify-live
```

## CI pipeline (GitHub Actions sketch)

1. **lint** — ruff, pyright, web lint  
2. **unit** — `make test` on runner (no Ray)  
3. **integration** — build images, `make test-integration` (compose + pytest); retry once on flake  
4. **build-push** — publish `raywatch/*` images on release tag  
5. **e2e** (optional) — `make test-e2e` on nightly  

## What we do not rely on

- Manual clicking through Ray’s dashboard to verify RayWatch  
- Tests that hit a developer’s laptop Ray cluster (non-reproducible)  
- Snapshotting entire cluster state in every unit test (only **minimal** golden slices)

## Related

- [backend-technology.md](./backend-technology.md)  
- [architecture.md](./architecture.md)  
