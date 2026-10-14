.PHONY: help install test lint fmt typecheck integration dev-api ray-up ray-down test-integration-ray ray-smoke

RAY_VERSION ?= 2.59.0
export RAY_VERSION

help:
	@echo "Targets: install, test, lint, test-integration-ray, ray-up, ray-down, dev-api"

install:
	uv sync --all-packages

export PYTHONPATH := packages/model/src:packages/engine/src:packages/adapter-ray/src:services/api/src:services/collector/src

test:
	uv run pytest -m "not integration"

lint:
	uv run ruff check .
	uv run ruff format --check .

fmt:
	uv run ruff format .
	uv run ruff check --fix .

typecheck:
	uv run pyright

integration:
	docker compose -f compose/docker-compose.ci.yml run --rm test

ray-up:
	docker compose -f compose/docker-compose.yml up -d ray-head

ray-down:
	docker compose -f compose/docker-compose.yml stop ray-head

test-integration-ray: ray-up
	@echo "Waiting for Ray dashboard..."
	@for i in $$(seq 1 45); do curl -sf http://127.0.0.1:8265/api/version >/dev/null && break; sleep 2; done
	RAY_INTEGRATION=1 RAYWATCH_FIXTURE_JOBS= RAY_DASHBOARD_URL=http://127.0.0.1:8265 \
		uv run pytest tests/integration -m integration -v

ray-smoke:
	bash scripts/ray_submit_smoke.sh

dev-api:
	PYTHONPATH="$(PYTHONPATH)" uv run raywatch-api

dev-api-live:
	RAYWATCH_USE_LIVE=1 RAYWATCH_FIXTURE_JOBS= RAY_DASHBOARD_URL=http://127.0.0.1:8265 \
		$(MAKE) dev-api
