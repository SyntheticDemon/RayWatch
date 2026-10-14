# Working against real Ray (grounding rule)

RayWatch must stay tied to **real Ray behavior**, not fixtures alone.

## Policy

1. **Pin a current Ray release** in Docker and docs (`RAY_VERSION`); bump intentionally when validating a new minor.
2. **Integration tests** hit a live Ray head (`RAY_DASHBOARD_URL`) and parse real State API JSON.
3. **Fixtures** remain for fast unit tests and CI determinism—they are copied/trimmed from real Ray responses after we capture them from a live cluster.
4. Before merging adapter changes, run `make ray-up` and `make test-integration-ray` locally when Docker is available.

## Current pin

| Setting | Value |
|---------|--------|
| `RAY_VERSION` | **2.59.0** (see [Ray releases](https://github.com/ray-project/ray/releases)) |
| Docker image | `rayproject/ray:2.59.0-py312` |
| Dashboard | `http://127.0.0.1:8265` |
| Jobs API | `GET /api/v0/jobs` (no trailing slash on 2.59) |

## Commands

```bash
export RAY_VERSION=2.59.0
make ray-up                    # starts ray-head only
make test-integration-ray      # pytest -m integration (needs dashboard up)
make ray-down
```

## Environment

| Variable | Purpose |
|----------|---------|
| `RAY_DASHBOARD_URL` | Base URL for State API (no trailing slash) |
| `RAYWATCH_FIXTURE_JOBS` | If set, **skips** live Ray (unit tests only) |
| `RAY_INTEGRATION=1` | Forces integration tests to require live Ray |

## Workflow for adapter changes

1. Run Ray head (`make ray-up`).
2. Optionally submit a smoke job (`scripts/ray_submit_smoke.sh`).
3. Capture `curl localhost:8265/api/v0/jobs/` → update golden fixture if shape changed.
4. Run `make test-integration-ray`.
