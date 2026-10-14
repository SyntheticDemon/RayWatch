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

pick_job_with_tasks() {
  python3 -c "
import json,sys,urllib.parse,urllib.request
api='http://127.0.0.1:${API_PORT}'
items=[]
cursor=None
while True:
    url=f'{api}/jobs?limit=100'
    if cursor:
        url += f'&cursor={urllib.parse.quote(cursor, safe=\"\")}'
    with urllib.request.urlopen(url) as resp:
        d=json.load(resp)
    items.extend(d.get('items') or [])
    cursor=d.get('next_cursor')
    if not cursor:
        break

def task_count(job_id: str) -> int:
    with urllib.request.urlopen(f'{api}/jobs/{job_id}/tasks?limit=5') as resp:
        body=json.load(resp)
    return len(body.get('items') or [])

candidates=[j['job_id'] for j in items if 'demo_tasks' in j.get('job_id','')]
candidates += [j['job_id'] for j in items]
seen=set()
for job_id in candidates:
    if job_id in seen:
        continue
    seen.add(job_id)
    if task_count(job_id) > 0:
        print(job_id)
        sys.exit(0)
sys.exit(1)
"
}

JOB_ID=""
for _ in $(seq 1 12); do
  curl -sf -X POST "http://127.0.0.1:${API_PORT}/sync/trigger" >/dev/null || true
  sleep 3
  if JOB_ID="$(pick_job_with_tasks)"; then
    break
  fi
  JOB_ID=""
done
if [[ -z "${JOB_ID}" ]]; then
  echo "No job with indexed tasks after demo-ray (sync retries exhausted)" >&2
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

TASKS="$(curl -sf "http://127.0.0.1:${API_PORT}/jobs/${JOB_ID}/tasks?limit=50")"
echo "${TASKS}" | python3 -c "
import json,os,sys
b=json.load(sys.stdin)
items=b.get('items') or []
print('tasks for job:', len(items))
assert 'sync' in b
if len(items) == 0 and os.environ.get('VERIFY_LIVE_REQUIRE_TASKS', '1') == '1':
    print('error: expected indexed tasks after demo-ray sync', file=sys.stderr)
    sys.exit(1)
"

echo "==> Integration tests (live Ray)"
RAY_INTEGRATION=1 RAYWATCH_FIXTURE_JOBS= RAY_DASHBOARD_URL="${RAY_DASHBOARD_URL}" \
  uv run pytest tests/integration -m integration -q --tb=short

if [[ "${VERIFY_LIVE_BENCHMARK:-1}" != "0" ]]; then
  echo "==> Jobs list warm p95 vs Ray dashboard (assert)"
  RAY_INTEGRATION=1 RAYWATCH_BENCHMARK_COMPARE_RAY=1 RAYWATCH_BENCHMARK_ASSERT_WARM=1 \
    RAYWATCH_BENCHMARK_WRITE=1 RAY_DASHBOARD_URL="${RAY_DASHBOARD_URL}" \
    BENCHMARK_JOB_SCALES=10,25 \
    uv run pytest tests/nfr/test_dashboard_latency_benchmark.py -m benchmark -q --tb=short
fi

echo "==> OK live stack verified"
