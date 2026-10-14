#!/usr/bin/env bash
# Stop RayWatch local dev stack: compose services, background API/web, pid files.
#
# Usage:
#   ./scripts/dev-clean.sh           # stop containers + dev processes
#   ./scripts/dev-clean.sh --volumes # also remove compose volumes (postgres data)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${ROOT}/compose/docker-compose.yml"
RUN_DIR="${ROOT}/.dev/run"
REMOVE_VOLUMES=0

for arg in "$@"; do
  case "$arg" in
    --volumes | -v) REMOVE_VOLUMES=1 ;;
    -h | --help)
      echo "Usage: $0 [--volumes]"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

dc() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

"${ROOT}/scripts/port-hygiene.sh" 2>/dev/null || true

echo "==> Stopping background API / web (if started by dev-up)..."
if [[ -d "${RUN_DIR}" ]]; then
  for pidfile in "${RUN_DIR}"/*.pid; do
    [[ -f "${pidfile}" ]] || continue
    pid="$(cat "${pidfile}")"
    if kill -0 "${pid}" 2>/dev/null; then
      echo "   kill $(basename "${pidfile}" .pid) (pid ${pid})"
      kill "${pid}" 2>/dev/null || true
      wait "${pid}" 2>/dev/null || true
    fi
    rm -f "${pidfile}"
  done
fi

# Fallback: processes not tracked in pid files
if pgrep -f "uv run raywatch-api" >/dev/null 2>&1; then
  echo "   stopping stray raywatch-api"
  pkill -f "uv run raywatch-api" 2>/dev/null || true
fi

if docker info >/dev/null 2>&1; then
  echo "==> Docker compose down..."
  if [[ "${REMOVE_VOLUMES}" -eq 1 ]]; then
    dc down --remove-orphans -v
  else
    dc down --remove-orphans
  fi

  for port in 8265 6379 8080 5432; do
    ids="$(docker ps -q --filter "publish=${port}" 2>/dev/null || true)"
    if [[ -n "${ids}" ]]; then
      echo "==> Removing containers still bound to :${port}..."
      docker rm -f ${ids} 2>/dev/null || true
    fi
  done
else
  echo "==> Docker not running; skipped compose / container cleanup."
fi

rm -rf "${RUN_DIR}"
echo "==> Done. Use ./scripts/dev-up.sh to start again."
