#!/usr/bin/env bash
# Agent/CI: Ray head + demo jobs + live API smoke (no manual steps).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PYTHONPATH="packages/model/src:packages/engine/src:packages/adapter-ray/src:services/api/src:services/collector/src"
API_PORT="${API_PORT:-18081}"
RAY_DASHBOARD_URL="${RAY_DASHBOARD_URL:-http://127.0.0.1:8265}"

echo "==> Ray up + demo jobs"
make ray-up
bash scripts/demo_occupied_ray.sh

echo "==> Start live API on :${API_PORT}"
pkill -f "API_PORT=${API_PORT}.*raywatch-api" 2>/dev/null || true
RAYWATCH_USE_LIVE=1 RAYWATCH_FIXTURE_JOBS= RAY_DASHBOARD_URL="${RAY_DASHBOARD_URL}" \
  API_PORT="${API_PORT}" uv run raywatch-api &
API_PID=$!
trap 'kill "${API_PID}" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null && break
  sleep 1
done
curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null

JOB_ID="$(curl -sf "http://127.0.0.1:${API_PORT}/jobs?limit=5" | python3 -c "
import json,sys
d=json.load(sys.stdin)
items=d.get('items') or []
print(items[0]['job_id'] if items else '')
")"
if [[ -z "${JOB_ID}" ]]; then
  echo "No jobs from live API" >&2
  exit 1
fi
echo "==> Live job: ${JOB_ID}"

LOGS="$(curl -sf "http://127.0.0.1:${API_PORT}/jobs/${JOB_ID}/logs")"
echo "${LOGS}" | python3 -c "
import json,sys
b=json.load(sys.stdin)
assert 'logs' in b
if b.get('error_message'):
    print('warn: logs error:', b['error_message'][:200])
else:
    print('logs bytes:', len(b.get('logs') or ''))
"

echo "==> Integration tests (live Ray)"
RAY_INTEGRATION=1 RAYWATCH_FIXTURE_JOBS= RAY_DASHBOARD_URL="${RAY_DASHBOARD_URL}" \
  uv run pytest tests/integration -m integration -q --tb=short

echo "==> OK live stack verified"
