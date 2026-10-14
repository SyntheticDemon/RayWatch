# Job retention requirements

RayWatch must **retain the full story of every ingested job**—not a summary row—so the system remains useful after Ray drops runtime state and for lineage/compliance.

## Principle

**Job = root aggregate.** If we saw a job while connected, we persist everything we can collect about it until retention policy deletes it.

## Required job bundle (durable store)

| Category | Retain |
|----------|--------|
| **Identity** | Ray `job_id`, submission time, end time, terminal status, cluster epoch / session marker |
| **Metadata** | Driver metadata, entrypoint, submission id, user tags, git sha / pipeline id if provided |
| **Runtime context** | Runtime env reference, working dir hints, ray address snapshot (redacted secrets) |
| **Execution tree** | All tasks for the job (paginated in UI, **complete** in store) |
| **Attempts** | Every task attempt, retry index, failure reason, stack/error text when available |
| **Timeline** | State transitions per task/attempt (not only final state) |
| **Placement** | Worker id, node id, actor id associations at event time |
| **Objects** | Input/output ref ids and lineage links to [metadata assets](./metadata-lineage.md) |
| **Actors** | Actors created/used by the job and method tasks tied to them |
| **Logs** | Job-scoped and task-scoped log text or durable object-store pointers |
| **Control** | Stop/kill actions with actor, time, outcome |
| **Lineage** | Declared reads/writes/artifacts attached to the job or its tasks |
| **Snapshots** | Periodic job-level aggregates (task counts by state) for fast hub without recomputing |

## What we do not claim

- Data for jobs that **never** flowed through RayWatch ingestion  
- Ray internal state we cannot observe (undocumented GCS fields)  
- Unlimited retention without disk (policy-driven purge/export)

## Retention policy

- Configurable per deployment: e.g. **detailed tasks 90d**, **job summary + lineage 1y**, **logs 30d**  
- **Export** full job bundle (JSON + logs) before purge  
- Purge is **explicit** (API/admin), not silent data loss

## API / UI implications

- `GET /jobs/{id}` returns summary + links; `GET /jobs/{id}/bundle` or expand flags for full export  
- Historical jobs show **Archived** badge; all inspector features work from store  
- Search indexes job metadata, error text, and lineage URNs

## NFR IDs

See [non-functional-requirements.md](./non-functional-requirements.md) **R1–R3**.

## Related

- [persistence-and-history.md](./persistence-and-history.md)  
- [metadata-lineage.md](./metadata-lineage.md)  
