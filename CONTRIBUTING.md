# Contributing to RayWatch

Thanks for helping build RayWatch. This repo is docs-first today; code will follow the structure in [docs/coding-standards.md](docs/coding-standards.md).

## Quick start (when scaffold lands)

1. Install [uv](https://github.com/astral-sh/uv) and Docker.
2. `cp .env.example .env` and adjust Ray address if needed.
3. `make test` — unit + NFR SLO tests (excludes integration, benchmark, perf).
4. `make perf` — read-path latency vs `tests/perf/baselines.json` (see [perf-testing.md](docs/perf-testing.md)).
5. `make benchmark` / `make benchmark-ray` — informational vs Ray dashboard (no thresholds).
6. `docker compose -f compose/docker-compose.yml up` — full stack (when available).

## Standards

- **[Engineering governance](docs/engineering-governance.md)** — coverage bar, ADR sync, documenting unknowns.
- **[Coding standards](docs/coding-standards.md)** — layout, Python/TS style, API rules, tests, PRs.
- **[Testing strategy](docs/testing.md)** · **`make coverage`** (≥85% on packages + services).
- **[Architecture](docs/architecture.md)** · **[ADRs](docs/adr/README.md)** · **[Known challenges](docs/known-challenges.md)**.

## Pull requests

- Keep changes focused; include tests for behavior changes.
- **Incremental commits** that explain what changed and why.
- On larger changes, run **`make test`** before push (when scaffold exists).
- **Never weaken or delete tests** just to pass CI—fix production code or discuss test redesign first.
- Do not commit secrets or `.env` files.

## How we write code

See **[docs/coding-standards.md](docs/coding-standards.md)** — reuse, naming, function length, data-driven transforms, frontend structure, no agent-style sprawl.

## Architecture decisions

Significant choices (storage, process model, public API breaks) get a short ADR under `docs/adr/`.
