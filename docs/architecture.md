# RayWatch architecture

## Summary

RayWatch treats **Ray as the runtime and source of operational truth**. It continuously ingests cluster state, normalizes it into a **canonical execution graph**, indexes that graph for fast lookup, and serves a **job-centric dashboard** with scoped logs and **UI actions** (stop, terminate, etc.). On top of execution telemetry, a **[metadata lineage layer](./metadata-lineage.md)** records logical data/asset dependencies, retains them on disk, and links them to jobs and tasks—so provenance survives Ray resets. The product is **not** a debugger-first fork of Ray’s dashboard; it is an **operations, observability, and retained metadata** surface that scales to **many jobs** and large task counts inside a job.

Ray continues to own scheduling, tasks, actors, workers, nodes, object storage, placement groups, runtime environments, and GCS metadata. RayWatch does not replace those systems and avoids modifying Ray unless a gap cannot be closed via public APIs or optional agents.

## Five layers

### 1. Ray cluster (unchanged)

Distributed runtime: driver submissions become **jobs**; work runs as **tasks** and **actors** on **workers** attached to **nodes**; **object refs** flow through the object store; the **head / GCS** holds authoritative metadata exposed via State API, events, and logs.

### 2. Ingestion

A **Ray runtime adapter** continuously collects state from supported interfaces: State API, task events, job/actor/task/worker/node/object metadata, logs, and related runtime signals.

- **Initial snapshot** on connect, then **incremental updates** (events where available, selective polling elsewhere).
- **Reconciliation** so the live cache does not drift from Ray; stale/degraded UX when ingest lags. See [sync-with-ray.md](./sync-with-ray.md).
- The browser must **not** trigger a full cluster snapshot on every navigation.
- Optional **node/worker inspection agents** (later) for stacks, process health, and bounded actor diagnostics—never automatic serialization of arbitrary actor state.

### 3. State normalization

Raw Ray payloads are converted into a **canonical execution model** independent of Ray dashboard JSON shapes.

**First-class entities:** jobs, tasks, task attempts, actors, workers, nodes, objects, placement groups, runtime environments (as needed).

**Explicit relationships:**

- Job → tasks  
- Task → worker → node  
- Task → actor (method invocations)  
- Task → parent task / child tasks  
- Task → input objects / output objects  
- Task → attempts (retries, failures)  
- Actor → worker → node  
- Object → producer task, consumer tasks  

**State transitions** are stored as a timeline (submitted, waiting, scheduled, running, failed, retry, completed, …), not only the current enum—so the UI can answer “why” and “how long in this state,” not only “what state now.”

### 4. Storage and query

**Live store:** in-memory (or embedded) **indexed** graph for active debugging and ops—lookups by id, by job, by worker, by parent task, by object lineage, etc. Common path: user selects a task → O(1)-style fetch of worker, node, actor, deps, attempts, recent transitions.

**Historical store (durable):** append-only record on **disk** (SQLite/Postgres)—completed tasks, attempts, transitions, failures, timing, logs, control actions. **Separate** from the hot RAM path so old executions do not slow current jobs. When **Ray resets or drops metadata**, RayWatch remains the **long-lived execution record** for anything ingested while connected. See [persistence-and-history.md](./persistence-and-history.md).

### 5. API and web UI

**Backend:** compact HTTP API over the graph (entity get, expand relationships, search, filter, historical queries, log tail/fetch, **control actions**). **WebSockets** (or SSE) for patches to entities the user is viewing—not whole-cluster pushes.

**Frontend:** see [product-vision.md](./product-vision.md) and [frontend.md](./frontend.md). Job-first navigation, nesting, dark minimal UI, Dagster-like *workflow* without Dagster’s visual complexity.

## Control plane (write path)

The original debug-oriented spec emphasized read paths. RayWatch explicitly adds a **control adapter** (or `RuntimeAdapter` write methods) that maps UI actions to supported Ray APIs: e.g. stop job, cancel where supported, kill actor—with confirmation, idempotency, and an audit trail. The UI should not require CLI for routine termination. An optional **[Ray CLI console](./ray-cli-console.md)** (guided commands, then allowlisted PTY) hosts the `ray` CLI in the browser for power users—behind auth, roles, and audit—not a replacement for structured Control actions.

## RuntimeAdapter boundary

All Ray-specific parsing and API calls live behind **`RuntimeAdapter`** (read + write). The normalized graph, indexes, and query engine depend on the **canonical model**, not Ray response layouts—easing tests (golden fixtures) and future runtime support.

## Challenges and responses

| Challenge | Response |
|-----------|----------|
| Stock dashboard lists are siloed and slow at scale | Incremental ingest + indexed graph; server-side filter and pagination |
| Many concurrent jobs | Job-scoped indexes; jobs hub as home; aggregate then drill down |
| Ops actions missing in UI | Control adapter + actions API |
| Logs scattered on workers | Ingest/tail logs keyed by job, task, worker id |
| Unstable identity (task vs attempt, worker restart) | Canonical IDs and attempt model documented in schema; golden tests |
| Huge task counts per job | Never render full sets; virtualization, cursors, grouped counts by state/stage/function |

## Implementation order (recommended)

1. Canonical execution model + schema versioning + Ray read adapter fixtures  
2. Normalize jobs, tasks, attempts, actors, workers, nodes, objects  
3. Indexed live-state engine  
4. HTTP API: jobs list, job detail, task detail + expand  
5. Minimal dark UI: jobs → job → nested tasks + logs  
6. Control actions (stop job, then actor/worker as APIs allow)  
7. Search by Ray identifiers  
8. State-transition history (derive from events or snapshot diffs)  
9. Live updates to the frontend  
10. Historical persistence (disk; survival across Ray reset)  
11. Object/dependency lineage UI + [metadata lineage layer](./metadata-lineage.md)  
12. Optional inspection agents and actor diagnostic hooks  
13. Causal / blocking explanations (advanced)  
14. Upstream Ray changes only if gaps are proven unfillable externally  

## Professional OSS expectations

- **Monorepo** with clear packages: model, `adapter-ray`, engine, collector, api, web  
- **Semver**, supported Ray version range, CI matrix against Ray in Docker  
- **Tests:** normalization golden files, API contract tests, integration smoke (submit job → visible in API/UI)  
- **Docs:** this folder, ADRs for model and actions, CONTRIBUTING when the repo grows  

## Related reading

- [product-vision.md](./product-vision.md)  
- [ray-primer.md](./ray-primer.md)  
- [frontend.md](./frontend.md)  
