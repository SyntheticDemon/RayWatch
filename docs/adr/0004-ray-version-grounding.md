# ADR 0004: Pin and test against real Ray (2.59)

## Status

Accepted

## Context

Fixture-only development drifts from Ray dashboard API changes.

## Decision

- Pin **`rayproject/ray:2.59.0-py312`** in compose (`RAY_VERSION`).
- Require **`make test-integration-ray`** (live dashboard) before adapter merges when Docker is available.
- Capture new JSON shapes as fixtures (e.g. `jobs_list_2_59.json`) after validating on a live head.

## Learned (2.59)

- Jobs endpoint: **`/api/v0/jobs`** — trailing slash returns **404**.
- Response shape: `data.result.result[]` with `submission_id`, not only legacy `data[job_id]` map.
- Compose must **`sleep infinity`** after `ray start` or the container exits.
