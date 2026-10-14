#!/usr/bin/env bash
# Populate a local Ray head with demo jobs (tasks + log lines) for RayWatch / Ray dashboard.
#
# Usage:
#   ./scripts/demo_occupied_ray.sh              # default: 6 quick jobs + 1 task-heavy + 1 loggy runner
#   DEMO_RAY_JOBS=15 ./scripts/demo_occupied_ray.sh
#
# Then:
#   make dev-api-live
#   cd apps/web && npm run dev
#   open http://localhost:3000
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f ${ROOT}/compose/docker-compose.yml"
DASHBOARD="${RAY_DASHBOARD_URL:-http://127.0.0.1:8265}"
API="${RAYWATCH_API_URL:-http://127.0.0.1:8080}"
N_QUICK="${DEMO_RAY_JOBS:-6}"

echo "==> Starting Ray head (if needed)..."
${COMPOSE} up -d ray-head

echo "==> Waiting for dashboard ${DASHBOARD}..."
for _ in $(seq 1 60); do
  if curl -sf "${DASHBOARD}/api/version" >/dev/null; then
    break
  fi
  sleep 2
done
curl -sf "${DASHBOARD}/api/version" | head -c 200
echo ""

submit() {
  local name="$1"
  local py="$2"
  echo "   submit: ${name}"
  ${COMPOSE} exec -T ray-head ray job submit \
    --address="${DASHBOARD}" \
    --no-wait \
    --submission-id "raysubmit_demo_${name}_$(date +%s)" \
    -- python -c "${py}" || true
}

echo "==> Submitting ${N_QUICK} quick pass jobs (history noise)..."
for i in $(seq 1 "${N_QUICK}"); do
  submit "pass${i}" "print('raywatch-demo-pass-${i}')"
  sleep 0.3
done

echo "==> Submitting task-heavy job (5 @ray.remote tasks)..."
submit "tasks" "$(cat <<'PY'
import ray
ray.init()
@ray.remote
def step(x):
    print(f"task-step-{x}", flush=True)
    return x * 2
print("driver-start", flush=True)
refs = [step.remote(i) for i in range(5)]
print("results", ray.get(refs), flush=True)
print("driver-done", flush=True)
PY
)"

echo "==> Submitting failing job (errors in Ray job logs)..."
submit "fail" "$(cat <<'PY'
import sys
print("about to fail", flush=True)
print("ERROR demo: intentional failure for log viewer", flush=True)
sys.stderr.write("stderr: demo stack context\n")
sys.exit(1)
PY
)"

echo "==> Submitting long-running job (tail logs while RUNNING)..."
submit "runner" "$(cat <<'PY'
import time
for i in range(30):
    print(f"heartbeat {i}/29", flush=True)
    time.sleep(2)
print("runner finished", flush=True)
PY
)"

echo ""
echo "==> Ray dashboard: ${DASHBOARD}"
echo "==> Ray jobs API:    ${DASHBOARD}/api/v0/jobs"
echo ""
echo "==> After 'make dev-api-live', try RayWatch:"
echo "    API jobs:  curl -s ${API}/jobs?limit=20 | head -c 1200"
echo "    freshness: curl -s ${API}/freshness"
echo ""
echo "==> Logs (pick a submission_id from /jobs):"
echo "    Ray:       curl -s ${DASHBOARD}/api/jobs/<submission_id>/logs | head -c 800"
echo "    RayWatch:  curl -s ${API}/jobs/<submission_id>/logs | head -c 800"
echo ""
echo "==> UI: cd apps/web && npm run dev  →  http://localhost:3000"
echo "    Open a job → Tasks table → Logs panel (polls Ray job logs via API)."
echo ""
sleep 3
echo "==> Current job count (Ray):"
curl -s "${DASHBOARD}/api/v0/jobs" | python3 -c "
import json,sys
d=json.load(sys.stdin)
r=d.get('data',{}).get('result',{}).get('result',[])
print('jobs in API payload:', len(r))
for j in r[:8]:
    print(' -', j.get('submission_id'), j.get('status'))
" 2>/dev/null || echo "(install python3 to summarize)"
