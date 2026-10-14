# RayWatch

Operations dashboard and **retained execution state** for [Ray](https://www.ray.io/)—jobs, tasks, logs, actions, and history that survives cluster resets.

**Status:** scaffold only; see [docs/](docs/README.md) for architecture and standards.

## Repo layout

```
packages/model/          # Shared types
packages/engine/         # live_cache indexes
packages/adapter-ray/    # Ray sync + normalize
services/collector/      # ingest loop
services/api/            # HTTP + WS
apps/web/                # React UI
compose/                 # Docker Compose (dev + CI)
tests/                   # unit + integration
docs/                    # design docs
```

## Prerequisites

- [uv](https://github.com/astral-sh/uv) (Python 3.12+)
- Docker (integration / full stack)
- Node 22+ (frontend)

## Quick start

```bash
make install
make test
make dev-api          # http://localhost:8080/health
```

```bash
cp .env.example .env
docker compose -f compose/docker-compose.yml up postgres api
```

**Full local stack** (Ray + RayWatch UI — run once, then use the browser):

```bash
make dev-down    # optional: clear stale containers
make dev         # starts Ray dashboard, RayWatch API, and UI; opens both tabs if possible
make dev-down    # when you're done
```

| URL | Purpose |
|-----|---------|
| http://127.0.0.1:3000/jobs | RayWatch jobs hub |
| http://127.0.0.1:8265/#/jobs | Ray Dashboard (same cluster) |

No browser auto-open: `OPEN_BROWSER=0 make dev`. More demo jobs: `DEMO_RAY_JOBS=30 make dev`. Fixture-only: `./scripts/dev-up.sh --fixture --detach`.

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) · [Coding standards](docs/coding-standards.md)
