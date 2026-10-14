# Contributing to RayWatch

Thanks for helping build RayWatch. This repo is docs-first today; code will follow the structure in [docs/coding-standards.md](docs/coding-standards.md).

## Quick start (when scaffold lands)

1. Install [uv](https://github.com/astral-sh/uv) and Docker.
2. `cp .env.example .env` and adjust Ray address if needed.
3. `make test` — fast unit tests.
4. `docker compose -f compose/docker-compose.yml up` — full stack (when available).

## Standards

- **[Coding standards](docs/coding-standards.md)** — layout, Python/TS style, API rules, tests, PRs.
- **[Testing strategy](docs/testing.md)**
- **[Architecture](docs/architecture.md)**

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
