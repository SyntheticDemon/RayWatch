#!/usr/bin/env bash
# Side-by-side jobs list latency: Ray dashboard API vs RayWatch (local smoke).
#
# Usage (stack must be up: make dev-up or dev-up --detach):
#   ./scripts/compare-jobs-list-latency.sh
#   WARMUP=5 ROUNDS=20 ./scripts/compare-jobs-list-latency.sh
#
set -euo pipefail

RAY_BASE="${RAY_DASHBOARD_URL:-http://127.0.0.1:8265}"
RAY_JOBS_URL="${RAY_BASE}/api/v0/jobs"
API_BASE="${RAYWATCH_API_URL:-http://127.0.0.1:8080}"
RW_JOBS_URL="${API_BASE}/jobs?limit=50"
WARMUP="${WARMUP:-5}"
ROUNDS="${ROUNDS:-15}"

time_curl() {
  local url="$1"
  curl -sf -o /dev/null -w "%{time_total}" "${url}"
}

ms_from_sec() {
  python3 -c "import sys; print(f'{float(sys.argv[1]) * 1000:.2f}')" "$1"
}

p95_ms() {
  python3 -c "
import sys
vals=sorted(float(x) for x in sys.stdin.read().split())
if not vals:
    print('0')
    sys.exit(0)
k=max(0, int(0.95 * len(vals)) - 1)
print(f'{vals[k]:.2f}')
"
}

echo "Ray dashboard: ${RAY_JOBS_URL}"
echo "RayWatch:      ${RW_JOBS_URL}"
echo "warmup=${WARMUP} rounds=${ROUNDS}"
echo ""

curl -sf "${API_BASE}/health" >/dev/null || {
  echo "RayWatch API not reachable at ${API_BASE}" >&2
  exit 1
}
curl -sf "${RAY_BASE}/api/version" >/dev/null || {
  echo "Ray dashboard not reachable at ${RAY_BASE}" >&2
  exit 1
}

ray_samples=()
rw_samples=()

for _ in $(seq 1 "${WARMUP}"); do
  time_curl "${RAY_JOBS_URL}" >/dev/null || true
  time_curl "${RW_JOBS_URL}" >/dev/null || true
done

for _ in $(seq 1 "${ROUNDS}"); do
  t="$(time_curl "${RAY_JOBS_URL}")"
  ray_samples+=("$(ms_from_sec "${t}")")
  t="$(time_curl "${RW_JOBS_URL}")"
  rw_samples+=("$(ms_from_sec "${t}")")
done

ray_p95="$(printf '%s\n' "${ray_samples[@]}" | p95_ms)"
rw_p95="$(printf '%s\n' "${rw_samples[@]}" | p95_ms)"
ray_cold="${ray_samples[0]}"
rw_cold="${rw_samples[0]}"

ray_count="$(curl -sf "${RAY_JOBS_URL}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
r=d.get('data',{}).get('result',{}).get('result',[])
print(len(r))
" 2>/dev/null || echo "?")"

rw_count="$(curl -sf "${API_BASE}/ready" | python3 -c "import json,sys; print(json.load(sys.stdin).get('job_count','?'))")"

echo "| source     | jobs indexed | cold (ms) | warm p95 (ms) |"
echo "|------------|--------------|-----------|---------------|"
echo "| Ray        | ${ray_count}           | ${ray_cold}     | ${ray_p95}         |"
echo "| RayWatch   | ${rw_count}           | ${rw_cold}     | ${rw_p95}         |"
echo ""
echo "Open both UIs and scroll the jobs list:"
echo "  RayWatch:  http://127.0.0.1:3000/jobs"
echo "  Ray:       ${RAY_BASE}/#/jobs"
