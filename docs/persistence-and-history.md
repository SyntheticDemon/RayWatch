# Persistence and history (beyond Ray’s memory)

## Problem

Ray’s **operational state is ephemeral**. When the cluster restarts, jobs finish, or GCS/metadata is trimmed, Ray’s dashboard and State API **lose** much of what you needed for ops: job outcomes, task timelines, failures, retries, worker assignment, and often log pointers.

RayWatch is not only a faster live view—it is a **durable execution record** of what happened on the cluster while we were connected (and optionally log text we captured).

## Roles

| Store | Role | Survives… |
|-------|------|-----------|
| **Ray (GCS / State API)** | Source of truth for **current** runtime | Cluster reset, retention limits, completed job eviction |
| **RayWatch live index (RAM)** | Fast **now** — running jobs, open tasks | RayWatch process restart (unless rebuilt from history + resync) |
| **RayWatch historical store (disk)** | **Long-lived** jobs, tasks, attempts, transitions, actions audit, log chunks | Ray reset, RayWatch restart (if DB intact) |

**Product statement:** After Ray “forgets,” RayWatch should still answer: *What jobs ran? Which failed? What was the task graph? How long in each state? Who stopped it?* The same durable tier also holds **[metadata lineage](./metadata-lineage.md)** (datasets, artifacts, declared dependencies)—not only Ray entity ids.

## What we persist (append-only events)

While ingesting, the collector **appends** to disk (not only updating RAM):

- Job lifecycle (submitted → terminal) and metadata snapshots  
- Task and **attempt** records  
- **State transitions** (timeline), not just final status  
- Actor/worker/node associations at time of event (ids may be stale after reset—that is OK; we store what we knew)  
- Object ref edges (producer/consumers) when Ray exposes them  
- **Control actions** (stop/kill) with user, time, outcome  
- **Log segments** we tailed (or object store path + byte range if we only store references)  

Normalization rules and schema version are stored with exports for replay/debug.

## Storage technology (planned)

| Phase | Choice |
|-------|--------|
| **Early / single node** | **SQLite** (WAL mode) or **PostgreSQL** if you already run it for the team |
| **Scale (100k+ jobs)** | Postgres with indexes on `(job_id)`, `(task_id)`, `(status, ended_at)`, full-text on error messages optional |
| **Not** | Relying on browser localStorage or Ray head disk |

Live RAM remains a **cache/index** over recent + active data; historical DB is the **system of record** for completed and post-reset queries.

## Query behavior

| User action | Source |
|-------------|--------|
| Running jobs hub | Live index (RAM), backed by Ray resync |
| Failed job from last week | **Historical** (Ray may return 404) |
| Task timeline after cluster restart | **Historical** if job was ingested before reset |
| “Is this live?” | UI badge: **live** vs **archived** (no updates from Ray) |

## Ingestion after Ray reset

1. Collector reconnects; Ray snapshot shows **empty or new** cluster ids.  
2. Live index rebuilds from Ray **current** state only.  
3. **Historical** data unchanged; UI search still finds old `job_id`s.  
4. Optional: mark cluster **epoch** or `ray_session_id` in metadata so users don’t confuse old workers with new cluster.

## Retention and compliance

- Configurable **retention** (e.g. 90 days tasks, 1 year job summaries, 7 days raw logs).  
- Export job bundle (JSON + logs) for tickets.  
- Deletion API for GDPR-style requests (job id purge).

## NFR alignment

- Historical persistence is **required for production** deployments that depend on post-mortems—not an optional v2 nice-to-have.  
- RayWatch restart: **reload live from Ray** + **continue serving history from disk** (see [non-functional-requirements.md](./non-functional-requirements.md)).

## Related

- [architecture.md](./architecture.md)  
- [architecture-levels.md](./architecture-levels.md) (level 5)  
