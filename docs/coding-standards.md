# Coding standards (RayWatch)

Living document. **Propose changes via PR.**

---

## Philosophy

| Idea | How we apply it |
|------|------------------|
| **Code reuse** | Share logic via plain functions and modules; copy-paste twice is a signal to extract—**not** before. |
| **No agent-shaped code** | Avoid dozens of 3-line wrappers, vague `data`/`result`/`handle` names, and “layer cake” for show. Write what a human would want to read in six months. |
| **Data-driven transforms** | Prefer **pipelines**: `raw → normalize → apply_to_index → events`. Pure functions over nested class hierarchies. **No inheritance trees** unless the stdlib/SDK forces it. |
| **Abstraction** | Introduce interfaces/base classes **only** when the same behavior is reused in 2+ places (e.g. `RuntimeAdapter` for Ray). Otherwise keep it concrete. |
| **Intuitive names** | Names state *what* something is in the domain (`job_bundle`, `ingest_lag_ms`). See [naming preferences](#naming-preferences-game) below. |

---

## Function & module size

| Guideline | Rule |
|-----------|------|
| **Function length** | Aim for **10–25 lines** of meaningful logic. Shorter than ~10 lines is often too chopped—merge unless it’s a named step in a clear pipeline. |
| **Long functions** | **25–200 lines** is fine when one story (e.g. a normalizer for one Ray payload shape). |
| **Hard ceiling** | Avoid **>200 lines** per function; split by transformation stage. |
| **Modules** | Same spirit: if a file passes ~300–400 lines, split by feature (e.g. `job_normalizer.py` vs `task_normalizer.py`). |

Readability beats micro-functions.

---

## Repository layout (target)

```
packages/model/       # Canonical types — no Ray, no FastAPI
packages/engine/      # Indexes, eviction, queries — no HTTP
packages/adapter-ray/ # Ray I/O + normalize pipelines
services/collector/
services/api/
apps/web/
compose/
tests/fixtures/ray/
docs/
```

**Dependency rule:** `model` ← `engine` ← `adapter-ray` / `collector` / `api`. No upward imports.

---

## Python

### Tooling

**uv**, **Ruff** (line length **100**), **pyright** (strict on packages above), **pytest** + **pytest-asyncio**.

### Style

- **Pydantic v2** for boundaries; **dicts** only inside a single transform step.
- **async** for I/O; heavy CPU batches off the event loop.
- **structlog** with `job_id`, `task_id`, `request_id`—never secrets.

### Transform pattern (preferred)

```python
def normalize_task_batch(ray_tasks: list[RayTaskRow], ctx: NormalizeContext) -> list[CanonicalEvent]:
    """One readable pipeline: map rows, attach edges, emit events."""
    rows = [parse_task_row(row) for row in ray_tasks]
    rows = [attach_worker_edges(row, ctx.workers_by_id) for row in rows]
    return [to_canonical_event(row) for row in rows]
```

Prefer **one module per pipeline stage** over a `BaseNormalizer` hierarchy.

### Adapter

- Only package that talks to Ray HTTP/SDK.
- Golden fixtures: `tests/fixtures/ray/<version>/…`

---

## TypeScript / frontend (`apps/web`)

Written for **maintainability** (feature-first, strict types, boring tech). You don’t have to be the frontend expert—we follow common 2025 practice:

| Practice | What we do |
|----------|------------|
| **Feature folders** | `src/features/jobs/`, `src/features/tasks/` — UI, hooks, and API calls for that feature live together. |
| **Shallow tree** | Max **2–3** levels under `features/`; no deep `components/atoms/molecules/…` maze. |
| **Shared only when reused** | `src/shared/ui/` (Button, LogViewer), `src/shared/api/client.ts` — **features must not import each other**; shared never imports features. |
| **Absolute imports** | `@/features/jobs/...` via `tsconfig` paths. |
| **File names** | **kebab-case** files (`job-summary.tsx`, `use-job-detail.ts`). |
| **Components** | PascalCase export; **server state in TanStack Query**, not `useEffect` fetch soup. |
| **Colocation** | Tests next to feature: `job-summary.test.tsx`. |
| **Barrels** | Small `index.ts` per feature ok; no giant app-wide re-export barrels (bundle + cycles). |
| **Composition** | Pages compose features; parallel queries at page level to avoid N+1 waterfalls. |

Tone: direct, typed, minimal abstraction—like a senior SWE, not a codegen dump.

---

## HTTP API

OpenAPI contract; cursor pagination; freshness fields (`source`, `last_ingest_at`, `stale`); stable error `code`s.

---

## Testing & quality

| Rule | Detail |
|------|--------|
| **No regressing tests** | Never weaken assertions or delete coverage just to green CI. Fix the code or **ask** before redesigning a test. |
| **Big changes** | Run **`make test`** (and integration when touching adapter/collector/API). |
| **Bug fix** | Regression test or fixture. |
| **Normalizer** | Golden JSON test. |

---

## Git & commits

- **`git init` done locally**; remote added later by maintainer.
- **Incremental commits** with clear messages: subject + body explaining *what* and *why*.
- Example:

  ```
  Add job retention requirements doc

  Documents full per-job bundle fields and export expectations
  so persistence work has a fixed target.
  ```

- Branches: `feat/…`, `fix/…`, `docs/…`
- No force-push to `main`.

---

## Naming preferences (game)

We calibrate names together. **Reply with 👍 / 👎 / meh** (or a short note) per row; locked choices get copied into [naming-registry.md](./naming-registry.md).

| # | Name | Context |
|---|------|---------|
| A | `ingest_lag_ms` | API freshness field |
| B | `sync_delay` | same |
| C | `hot_index` | RAM store |
| D | `live_cache` | same |
| E | `job_bundle` | archived full job snapshot |
| F | `job_snapshot` | same |
| G | `canonical_task` | after normalizer |
| H | `normalized_task` | same |
| I | `reconcile_running_jobs` | periodic diff |
| J | `sync_active_jobs` | same |
| K | `is_stale` | UI/API flag |
| L | `out_of_sync_with_ray` | same |
| M | `state_delta` | incremental change batch |
| N | `ingest_batch` | same |
| O | `lineage_edge` | metadata graph edge |
| P | `metadata_link` | same |

---

## Open decisions

| Topic | Proposal |
|-------|------------|
| Line length | 100 |
| Type checker | pyright |
| Frontend | Vite + React |
| Dev DB | Postgres in compose |
| License | TBD |

---

## Related

[testing.md](./testing.md) · [CONTRIBUTING.md](../CONTRIBUTING.md) · [architecture.md](./architecture.md)
