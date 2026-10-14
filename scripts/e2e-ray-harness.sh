#!/usr/bin/env bash
# Live Ray + live API + Playwright e2e. Cleans ports/processes on exit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT="${RAYWATCH_API_PORT:-18080}"
WEB_PORT="${RAYWATCH_WEB_PORT:-4173}"
export PYTHONPATH="${ROOT}/packages/model/src:${ROOT}/packages/engine/src:${ROOT}/packages/adapter-ray/src:${ROOT}/services/api/src:${ROOT}/services/collector/src"

cleanup() {
  echo "==> E2E harness cleanup..."
  if [[ -n "${API_PID:-}" ]] && kill -0 "${API_PID}" 2>/dev/null; then
    kill "${API_PID}" 2>/dev/null || true
    wait "${API_PID}" 2>/dev/null || true
  fi
  "${ROOT}/scripts/port-hygiene.sh"
  docker compose -f "${ROOT}/compose/docker-compose.yml" stop ray-head 2>/dev/null || true
}
trap cleanup EXIT

"${ROOT}/scripts/port-hygiene.sh"

echo "==> Ray head up..."
make -C "${ROOT}" ray-up
for _ in $(seq 1 45); do
  curl -sf http://127.0.0.1:8265/api/version >/dev/null && break
  sleep 2
done
curl -sf http://127.0.0.1:8265/api/version >/dev/null

"${ROOT}/scripts/submit_e2e_ray_jobs.sh"
# shellcheck source=/dev/null
source "${ROOT}/.dev/e2e/env.sh"
export RAYWATCH_E2E_LONG_JOB_ID
export RAYWATCH_E2E_FAIL_JOB_ID
export RAYWATCH_E2E_TASKS_JOB_ID

echo "==> Live API on :${API_PORT}..."
cd "${ROOT}"
RAYWATCH_USE_LIVE=1 \
  RAYWATCH_FIXTURE_JOBS= \
  RAY_DASHBOARD_URL=http://127.0.0.1:8265 \
  API_PORT="${API_PORT}" \
  uv run raywatch-api >"${ROOT}/.dev/e2e/api.log" 2>&1 &
API_PID=$!

for _ in $(seq 1 45); do
  curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null && break
  sleep 1
done
curl -sf -X POST "http://127.0.0.1:${API_PORT}/sync/trigger" >/dev/null
sleep 2
curl -sf -X POST "http://127.0.0.1:${API_PORT}/sync/trigger" >/dev/null
sleep 2

echo "==> Playwright (live Ray)..."
cd "${ROOT}/apps/web"
export RAYWATCH_E2E_LIVE=1
export RAYWATCH_E2E_HARNESS=1
export RAYWATCH_API_PORT="${API_PORT}"
export RAYWATCH_WEB_PORT="${WEB_PORT}"
export CI=1
npm run test:e2e
