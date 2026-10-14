.PHONY: help install test coverage lint fmt typecheck integration dev-api ray-up ray-down test-integration-ray ray-smoke benchmark benchmark-ray perf perf-baseline demo-ray install-e2e test-e2e verify-live test-all

test-e2e: install-e2e
	cd apps/web && npm run test:e2e

install-e2e:
	cd apps/web && npx playwright install chromium

test-all: test lint typecheck
	cd apps/web && npm run test
	$(MAKE) test-e2e

verify-live:
	bash scripts/verify_live_stack.sh

RAY_VERSION ?= 2.59.0
export RAY_VERSION

help:
	@echo "Targets: install, test, perf, lint, test-integration-ray, ray-up, ray-down, dev-api"

install:
	uv sync --all-packages

export PYTHONPATH := packages/model/src:packages/engine/src:packages/adapter-ray/src:services/api/src:services/collector/src

test:
	uv run pytest -m "not integration and not benchmark and not perf"

coverage:
	uv run pytest -m "not integration and not benchmark and not perf" \
		--cov=packages --cov=services --cov-report=term-missing --cov-fail-under=85

perf:
	uv run pytest tests/perf -m perf -s -q

perf-baseline:
	PERF_UPDATE_BASELINE=1 uv run pytest tests/perf -m perf -s -q

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

demo-ray:
	bash scripts/demo_occupied_ray.sh

benchmark:
	RAYWATCH_BENCHMARK_WRITE=1 uv run pytest tests/nfr/test_dashboard_latency_benchmark.py -m benchmark -s -q

benchmark-ray: ray-up
	@echo "Waiting for Ray dashboard..."
	@for i in $$(seq 1 45); do curl -sf http://127.0.0.1:8265/api/version >/dev/null && break; sleep 2; done
	RAY_INTEGRATION=1 RAYWATCH_BENCHMARK_COMPARE_RAY=1 RAYWATCH_BENCHMARK_WRITE=1 \
		RAYWATCH_BENCHMARK_ASSERT_WARM="$(RAYWATCH_BENCHMARK_ASSERT_WARM)" \
		RAY_DASHBOARD_URL=http://127.0.0.1:8265 $(MAKE) benchmark

benchmark-ray-assert:
	RAYWATCH_BENCHMARK_ASSERT_WARM=1 $(MAKE) benchmark-ray

dev-api:
	PYTHONPATH="$(PYTHONPATH)" uv run raywatch-api

dev-api-live:
	RAYWATCH_USE_LIVE=1 RAYWATCH_FIXTURE_JOBS= RAY_DASHBOARD_URL=http://127.0.0.1:8265 \
		$(MAKE) dev-api
