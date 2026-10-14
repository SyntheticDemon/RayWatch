.PHONY: help install test lint fmt typecheck integration dev-api

help:
	@echo "Targets: install, test, lint, fmt, typecheck, integration, dev-api"

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

dev-api:
	PYTHONPATH="$(PYTHONPATH)" uv run raywatch-api
