#!/usr/bin/env bash
# Submit a minimal Ray job against the compose ray-head (grounding smoke).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f ${ROOT}/compose/docker-compose.yml"
DASHBOARD="${RAY_DASHBOARD_URL:-http://127.0.0.1:8265}"

${COMPOSE} up -d ray-head
echo "Waiting for Ray dashboard at ${DASHBOARD}..."
for _ in $(seq 1 60); do
  if curl -sf "${DASHBOARD}/api/version" >/dev/null; then
    break
  fi
  sleep 2
done

${COMPOSE} exec -T ray-head ray job submit \
  --address="${DASHBOARD}" \
  -- python -c "import ray; ray.init(); print('raywatch-smoke-ok')"

echo "Jobs list:"
curl -s "${DASHBOARD}/api/v0/jobs/" | head -c 500
echo ""
