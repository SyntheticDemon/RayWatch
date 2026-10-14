#!/usr/bin/env bash
# Free RayWatch dev/e2e ports and stop stray API / Vite for this repo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORTS="${RAYWATCH_PORTS:-8080 3000 18080 4173}"

kill_listeners() {
  local port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
    return
  fi
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      kill ${pids} 2>/dev/null || true
    fi
  fi
}

echo "==> RayWatch port hygiene (${PORTS})..."
for port in ${PORTS}; do
  kill_listeners "${port}"
done

if pgrep -f "${ROOT}/.venv/bin/raywatch-api" >/dev/null 2>&1; then
  pkill -f "${ROOT}/.venv/bin/raywatch-api" 2>/dev/null || true
fi
if pgrep -f "${ROOT}/apps/web/node_modules/.bin/vite" >/dev/null 2>&1; then
  pkill -f "${ROOT}/apps/web/node_modules/.bin/vite" 2>/dev/null || true
fi

sleep 0.5
echo "==> Port hygiene done."
