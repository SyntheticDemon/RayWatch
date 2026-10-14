# ADR 0001: Single-process API + sync loop for MVP

## Status

Accepted (MVP)

## Context

We need a working demo quickly. The target architecture splits `collector` and `api` services.

## Decision

Run `sync_active_jobs` **inside the FastAPI lifespan** on the same `LiveCache` singleton as HTTP handlers. The standalone `raywatch-collector` CLI remains for a future split.

## Consequences

- **Pros:** No IPC, simple deploy, easy tests, one `docker` image for API suffices for demo.
- **Cons:** API process does Ray polling; scale-out needs shared cache or collector-only writer later (ADR follow-up).

## Learned

Fixture-driven sync (`RAYWATCH_FIXTURE_JOBS`) let us ship UI + API before every dev machine runs Ray.
