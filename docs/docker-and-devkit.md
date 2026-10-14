# Docker images and dev/test kit

RayWatch ships as **container images** and a **ready-to-run compose stack** so contributors and CI can build, test, and demo without manual Ray installs.

## Requirements (product / OSS)

| ID | Requirement |
|----|-------------|
| DK1 | **Published images** (GitHub Container Registry or Docker Hub): `raywatch/collector`, `raywatch/api`, `raywatch/web` (or single `raywatch/all-in-one` for demos). |
| DK2 | **Pinned Ray version** in integration image tags (e.g. `raywatch/ci:ray-2.10`). |
| DK3 | **docker compose** one command brings up Ray + RayWatch + DB for local dev. |
| DK4 | **Same compose profile** (or override file) used in CI integration job. |
| DK5 | **Healthchecks** on api, collector, ray head; `depends_on` with condition where supported. |
| DK6 | **Documented env** via `.env.example` (Ray address, DB URL, retention, auth off for dev). |
| DK7 | **No secrets in images**; mount or inject at runtime. |

## Local development stack (target layout)

```
docker/
  Dockerfile.api
  Dockerfile.collector
  Dockerfile.web
  Dockerfile.ci          # api+collector+dev deps for pytest in container
compose/
  docker-compose.yml     # dev: ray-head, postgres, collector, api, web
  docker-compose.ci.yml  # ci: ray-head, api+collector, run tests, exit
  docker-compose.e2e.yml # optional: + playwright runner
```

### Services (dev `docker compose up`)

| Service | Image | Role |
|---------|-------|------|
| `ray-head` | Official `rayproject/ray` (pinned minor) | Cluster for adapter integration |
| `postgres` | `postgres:16-alpine` | Historical + lineage + full job bundles |
| `collector` | `raywatch/collector` | Ingest → normalize → DB + live index |
| `api` | `raywatch/api` | HTTP + WebSocket |
| `web` | `raywatch/web` (nginx or static) | UI → api |

Ports (example): web `3000`, api `8080`, ray dashboard `8265` (optional, not required for RayWatch UI).

## Testing suite (one entrypoint)

Contributors and CI use the **same commands**:

| Command | Purpose |
|---------|---------|
| `make test` or `./scripts/test.sh` | Unit + contract (no Ray), fast |
| `make test-integration` | `docker compose -f compose/docker-compose.ci.yml run --rm test` |
| `make test-e2e` | Optional Playwright against compose stack |
| `make lint` | ruff, pyright, web eslint/tsc |

**CI image `Dockerfile.ci`**: Python + uv + repo checkout; mounts socket or joins compose network to `ray-head`.

Integration container runs:

```bash
uv run pytest -m integration --timeout=300
```

Exit code propagates to GitHub Actions job.

## Release images

- **Multi-stage builds**: slim runtime (no gcc), non-root user.  
- **Labels**: `org.opencontainers.image.version`, git sha.  
- **Semver tags**: `v0.1.0`, `v0.1.0-ray2.10`, `main` for nightly.  

## Optional: Dev Container

`.devcontainer/devcontainer.json` references `compose/docker-compose.yml` + `service: api` for VS Code/Cursor—same stack as local dev.

## Related

- [testing.md](./testing.md)  
- [non-functional-requirements.md](./non-functional-requirements.md)  
- [backend-technology.md](./backend-technology.md)  
