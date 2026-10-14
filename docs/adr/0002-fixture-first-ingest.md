# ADR 0002: Fixture-first ingest path

## Status

Accepted (MVP)

## Context

Ray dashboard JSON varies by version; CI must be deterministic.

## Decision

Default dev/test path: read `tests/fixtures/ray/jobs_list.json` via `RAYWATCH_FIXTURE_JOBS`. Production sets `RAY_DASHBOARD_URL` and omits the fixture env var.

## Consequences

- Golden test on `normalize_jobs_payload` locks parsing.
- Integration with live Ray is optional env switch, not blocking MVP.

## Learned

Normalize to `IngestBatch` ops early—engine never sees Ray field names.
