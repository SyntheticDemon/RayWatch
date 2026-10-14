# Naming registry

Locked names for RayWatch code and APIs. Principles: **short, plain words**; meaning clear without jargon (`canonical`, `reconcile`, `lineage` as type names only when unavoidable).

| Concept | Name | Avoid |
|---------|------|--------|
| Delay since last successful Ray sync | `sync_delay` | `ingest_lag_ms`, `freshness_delta` |
| In-memory live execution store | `live_cache` | `hot_index`, `materialized_view` |
| Full archived job record on disk | `job_snapshot` | `job_bundle`, `aggregate_root` |
| Task after normalizer | `normalized_task` | `canonical_task` |
| Periodic diff of running work vs Ray | `sync_active_jobs` | `reconcile_running_jobs` |
| Live view does not match Ray | `ray_out_of_sync` | `is_stale`, `out_of_sync_with_ray` (too long for locals) |
| Batch of changes from one poll/event tick | `ingest_batch` | `state_delta`, `mutation_set` |
| Metadata graph connection | `metadata_link` | `lineage_edge`, `provenance_arc` |

### API / JSON (camelCase for TS clients)

| Python / snake | JSON / TS |
|----------------|-----------|
| `sync_delay` | `syncDelay` |
| `live_cache` | _(internal only)_ |
| `job_snapshot` | `jobSnapshot` |
| `normalized_task` | `normalizedTask` |
| `ray_out_of_sync` | `rayOutOfSync` |
| `metadata_link` | `metadataLink` |

### Style rules

1. **Prefer everyday words:** sync, delay, cache, snapshot, active, link.  
2. **Length:** locals and fields **2–3 words** when possible; skip redundant prefixes (`ray_` only when disambiguating from DB vs Ray).  
3. **No heavy vocabulary** in identifiers: use comments or docs for formal terms.  
4. **Booleans:** `ray_out_of_sync` or `has_sync_error`—not `is_stale_degraded_flag`.  
5. **Functions:** verb + object — `sync_active_jobs`, `load_job_snapshot`, `apply_ingest_batch`.

Changes require a one-line PR to this file first.
