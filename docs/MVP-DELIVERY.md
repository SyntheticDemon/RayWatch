# MVP delivery (architect summary)

## What works

| Area | Delivered |
|------|-----------|
| **Ingest** | `sync_active_jobs` from Ray dashboard HTTP or JSON fixture → `IngestBatch` → `live_cache` |
| **API** | `GET /jobs`, `GET /jobs/{id}`, `GET /jobs/{id}/tasks`, `GET /freshness`, `POST /jobs/{id}/stop` (calls Ray when not on fixture) |
| **Honesty** | Every list/detail includes `sync` (`sync_delay_ms`, `ray_out_of_sync`, `last_sync_at`) |
| **UI** | Jobs table + job detail (status, entrypoint, sync banner) |
| **Tests** | Normalize golden, API contract, **NFR p95** on jobs list (&lt;200ms @ 1k jobs) and job get (&lt;100ms), sync honesty |

## Run it

```bash
make install
make test
make dev-api
# another terminal
cd apps/web && npm run dev
```

API loads fixture jobs automatically in dev unless `RAYWATCH_FIXTURE_JOBS` is cleared and `RAY_DASHBOARD_URL` points at a live head.

## Architectural decisions

See [docs/adr/](adr/):

1. **0001** — Single-process API + sync loop  
2. **0002** — Fixture-first ingest  
3. **0003** — Postgres deferred  

## What we learned building it

- **IngestBatch** as the only write contract keeps adapter and engine decoupled; adding tasks later is more ops, not new architecture.
- **live_cache** indexes must be updated in one place (`apply_ingest_batch`) so API latency tests actually mean something.
- Ray job JSON uses `submission_id` + nested `task_stats`; normalizer tolerates a few aliases—versioned fixtures will multiply as we support more Ray minors.
- **Stop job** over HTTP is best-effort in MVP; failures surface in response without pretending success.
- Frontend feature folder + TanStack Query keeps pages thin; proxy `/api` avoids CORS pain locally.

## Not in MVP (explicit)

- WebSocket patches, Postgres `job_snapshot`, task normalize from Ray, collector as separate deploy, auth, CLI console.

## Next recommended milestones

M5 durable snapshots, M2 task ingest, split collector process, integration test against compose Ray.
