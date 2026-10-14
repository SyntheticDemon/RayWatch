#!/usr/bin/env bash
# Submit jobs used by Playwright live e2e (long runner + loggy fail).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${ROOT}/compose/docker-compose.yml"
DASHBOARD="${RAY_DASHBOARD_URL:-http://127.0.0.1:8265}"
OUT_DIR="${ROOT}/.dev/e2e"
OUT_ENV="${OUT_DIR}/env.sh"

dc() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

submit() {
  local name="$1"
  local py="$2"
  dc exec -T ray-head ray job submit \
    --address="${DASHBOARD}" \
    --no-wait \
    --submission-id "raysubmit_e2e_${name}_$(date +%s)" \
    -- python -c "${py}"
}

mkdir -p "${OUT_DIR}"

echo "==> E2E: long-running job (for stop test)..."
submit "long" "$(cat <<'PY'
import time
print("e2e-long-start", flush=True)
for i in range(180):
    print(f"e2e-heartbeat {i}", flush=True)
    time.sleep(1)
print("e2e-long-end", flush=True)
PY
)" >/dev/null
sleep 3
LONG_ID="$(curl -sf "${DASHBOARD}/api/v0/jobs" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=d.get('data',{}).get('result',{}).get('result',[])
for j in rows:
    sid=j.get('submission_id') or ''
    if 'raysubmit_e2e_long' in sid and j.get('status') in ('PENDING','RUNNING'):
        print(sid)
        break
")"

echo "==> E2E: failing job (for logs test)..."
submit "fail" "$(cat <<'PY'
import sys
print("e2e-fail-marker", flush=True)
print("ERROR e2e intentional", flush=True)
sys.exit(1)
PY
)" >/dev/null
sleep 2
FAIL_ID="$(curl -sf "${DASHBOARD}/api/v0/jobs" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=d.get('data',{}).get('result',{}).get('result',[])
for j in rows:
    sid=j.get('submission_id') or ''
    if 'raysubmit_e2e_fail' in sid:
        print(sid)
        break
")"

echo "==> E2E: task-heavy job (for task detail)..."
submit "tasks" "$(cat <<'PY'
import ray
ray.init()
@ray.remote
def step(x):
    print(f"e2e-task-step-{x}", flush=True)
    return x * 2
print("e2e-tasks-driver", flush=True)
refs = [step.remote(i) for i in range(5)]
print("e2e-tasks-results", ray.get(refs), flush=True)
PY
)" >/dev/null
sleep 5
TASKS_ID="$(curl -sf "${DASHBOARD}/api/v0/jobs" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=d.get('data',{}).get('result',{}).get('result',[])
for j in rows:
    sid=j.get('submission_id') or ''
    if 'raysubmit_e2e_tasks' in sid:
        print(sid)
        break
")"

if [[ -z "${LONG_ID}" || -z "${FAIL_ID}" || -z "${TASKS_ID}" ]]; then
  echo "Could not resolve e2e job ids (long=${LONG_ID}, fail=${FAIL_ID}, tasks=${TASKS_ID})" >&2
  exit 1
fi

cat >"${OUT_ENV}" <<EOF
export RAYWATCH_E2E_LONG_JOB_ID="${LONG_ID}"
export RAYWATCH_E2E_FAIL_JOB_ID="${FAIL_ID}"
export RAYWATCH_E2E_TASKS_JOB_ID="${TASKS_ID}"
EOF
echo "==> Wrote ${OUT_ENV}"
echo "   LONG=${LONG_ID}"
echo "   FAIL=${FAIL_ID}"
