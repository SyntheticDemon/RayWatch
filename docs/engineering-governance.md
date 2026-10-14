# Engineering governance (OSS bar)

What we hold ourselves to before calling RayWatch **community-grade**: defendable code, measured tests, explicit architecture sync, and documented unknowns.

## Defendable code

| Expectation | How we enforce it |
|-------------|-------------------|
| Clear boundaries | `model` → `engine` → `adapter-ray` / `api` / `collector` (no upward imports) |
| One ingest contract | All Ray shapes → `IngestBatch` → `live_cache.apply_ingest_batch` |
| Honest API | `sync` metadata on reads; no fake “live” when Ray is down |
| Reviewable size | [coding-standards.md](./coding-standards.md) — pipelines over deep hierarchies |
| Locked names | [naming-registry.md](./naming-registry.md) |

**Defendable** means a reviewer can answer: *Where does data enter? Where is it indexed? What happens on Ray failure?* without reading the whole repo.

## Test coverage (measurable, not cosmetic)

| Layer | Command | Gate |
|-------|---------|------|
| Correctness + NFR SLO | `make test` | Required on every PR (CI) |
| Line coverage (Python) | `make coverage` | **≥ 85%** on `packages/*` + `services/*` (see `pyproject.toml`) |
| Read-path regression | `make perf` | Fresh HTTP client per sample; `PERF_WARMUP=0`; cache `reset()` between scenarios ([perf-testing.md](./perf-testing.md)) |
| Live Ray | `make test-integration-ray` | Before adapter changes (local; CI optional until stable) |
| Ray compare | `make benchmark-ray` | Evidence only; logged in [perf-improvement-log.md](./perf-improvement-log.md) |

Rules:

- **No weakening tests** to green CI—fix production code or discuss redesign ([coding-standards.md](./coding-standards.md)).
- Bug fixes include a **regression test** or golden fixture.
- Normalizers require **golden JSON** per Ray shape.
- Coverage excludes `if __name__ == "__main__"` runners; **does not** excuse untested adapter or sync paths.

## Architecture sync with the architect

1. **Significant** choices → ADR in [docs/adr/](./adr/) (see [adr/README.md](./adr/README.md)).
2. **Deferred** work → ADR + line in [mvp-scope.md](./mvp-scope.md) and [known-challenges.md](./known-challenges.md).
3. PRs that cross package boundaries should state: *which ADR applies*, *what NFRs are touched*.
4. If implementation **contradicts** docs, update docs in the **same PR** (or open an ADR superseding the old decision).

## Reporting what we could not solve

Use [known-challenges.md](./known-challenges.md) for:

- Blocked integrations (Ray API ambiguity, flaky Docker).
- **Hypotheses** for the next attempt—not presented as fact.
- What we need from the architect (canonical API choice, retention policy, etc.).

Agent or contributor: **do not hide failures** behind silent fallbacks without documenting them here or in an ADR consequence.

## Related

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [testing.md](./testing.md)
- [perf-testing.md](./perf-testing.md)
