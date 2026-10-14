# Known challenges and open hypotheses

Honest list of what we **have not solved** yet, why it is hard, and **best guesses** for the next experiments. Update this when integration tests or live Ray prove us wrong.

---

## 1. Task-level dashboard (no ingest yet)

**Symptom:** `GET /jobs/{id}/tasks` exists but live data is almost always empty—only job rows are synced from Ray.

**Why hard:** Ray exposes tasks via State API / dashboard endpoints that differ by version, paginate, and can be high volume. Normalizing task identity (attempts, nested tasks) must match [naming-registry.md](./naming-registry.md).

**Guess:** Start with Ray 2.59 `GET /api/v0/tasks` (or documented State HTTP path), golden fixtures per minor, and incremental `upsert_task` / `remove_task` in `sync_active_jobs` before optimizing indexes.

**Architect decision needed:** Which Ray API is the **canonical** task stream for supported versions (ADR + fixture matrix).

---

## 2. Incremental sync vs full poll

**Symptom:** Each sync replaces job snapshots from a full jobs list; no watermarks, no delete detection for jobs dropped from Ray’s list.

**Why hard:** Ray does not give us one cheap “changelog”; reconcile rules in [sync-with-ray.md](./sync-with-ray.md) need cluster epoch and delete semantics.

**Guess:** Phase 1: diff previous job id set vs new list → emit `remove_job` ops. Phase 2: per-stream watermarks when Ray documents stable cursors.

---

## 3. Durability (ADR 0003 deferred)

**Symptom:** Restart RayWatch → empty `live_cache` unless Ray or fixtures refill. Postgres in compose is **not wired**.

**Why hard:** M5 needs schema, migration story, and “live vs archived” query paths without lying in `sync` metadata.

**Guess:** `job_snapshot` upsert on ingest batch first (write-through), read still from RAM; then historical reads and eviction.

---

## 4. Ray dashboard parity for benchmarks

**Symptom:** We can show RayWatch **jobs list** p95 beats Ray **GET /api/v0/jobs** at moderate job counts; that is not the full Ray UI (tasks, actors, logs, metrics).

**Why hard:** Apples-to-apples needs the same **user action** mapped to Ray’s HTTP calls; submitting many jobs loads the cluster and is capped (`BENCHMARK_RAY_MAX_JOBS`).

**Guess:** Expand scorecard in [perf-testing.md](./perf-testing.md) per endpoint pair; keep Ray submit capped; use in-memory RayWatch scales for 10k+ jobs.

---

## 5. Live Ray integration flakiness

**Symptom:** `make test-integration-ray` depends on Docker, startup time, and dashboard readiness.

**Why hard:** Ray head startup is not instant; CI matrix multiplies cost.

**Guess:** Retry once on integration job in CI; keep PR gate on `make test` + `make coverage`; nightly `test-integration-ray` until stable.

---

## 6. Frontend scale

**Symptom:** Jobs page renders all items from one `GET /jobs` page; no virtualization, filter, or server search.

**Why hard:** Product vision requires server-side index + virtualized table; API lacks `status` / `q` filters.

**Guess:** API filters on indexed fields first, then TanStack Table + virtualizer; WebSocket patches after ingest is trustworthy.

---

## How to use this doc

- Before a large PR: check if your work **closes** an item (update or remove) or **adds** a new challenge.
- If you are blocked: add a row with **what you tried** and link the PR/issue.
- **Guesses are not decisions**—promote to ADR when the architect confirms.
