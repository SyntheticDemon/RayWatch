#!/usr/bin/env bash
# Full local stack for personal testing: Ray dashboard + demo jobs + live RayWatch API + UI.
#
# Usage:
#   ./scripts/dev-up.sh                    # live Ray; Vite in foreground (Ctrl+C stops API only)
#   ./scripts/dev-up.sh --detach           # Ray + API + web in background (use `make dev`)
#   ./scripts/dev-up.sh --clean --detach
#   ./scripts/dev-up.sh --jobs 50
#   ./scripts/dev-up.sh --fixture
#
# Stop everything (including Ray head):
#   ./scripts/dev-down.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${ROOT}/compose/docker-compose.yml"
RUN_DIR="${ROOT}/.dev/run"
DASHBOARD="${RAY_DASHBOARD_URL:-http://127.0.0.1:8265}"
RAY_JOBS_UI="${DASHBOARD}/#/jobs"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${RAYWATCH_WEB_PORT:-3000}"
API_BASE="http://127.0.0.1:${API_PORT}"
RW_JOBS_UI="http://127.0.0.1:${WEB_PORT}/jobs"
MODE="live"
DO_CLEAN=0
DETACH=0
DEMO_JOBS="${DEMO_RAY_JOBS:-12}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean) DO_CLEAN=1 ;;
    --fixture) MODE="fixture" ;;
    --detach) DETACH=1 ;;
    --jobs)
      DEMO_JOBS="${2:?--jobs requires a number}"
      shift
      ;;
    -h | --help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

dc() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

mkdir -p "${RUN_DIR}"

stop_background() {
  if [[ "${DETACH}" -eq 1 ]]; then
    return
  fi
  if [[ -f "${RUN_DIR}/api.pid" ]]; then
    pid="$(cat "${RUN_DIR}/api.pid")"
    if kill -0 "${pid}" 2>/dev/null; then
      echo "==> Stopping API (pid ${pid})..."
      kill "${pid}" 2>/dev/null || true
      wait "${pid}" 2>/dev/null || true
    fi
    rm -f "${RUN_DIR}/api.pid"
  fi
}
trap stop_background EXIT

if [[ "${DO_CLEAN}" -eq 1 ]]; then
  "${ROOT}/scripts/dev-clean.sh"
fi

echo "==> Installing Python deps (uv)..."
cd "${ROOT}"
uv sync --all-packages

echo "==> Installing web deps (npm)..."
cd "${ROOT}/apps/web"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

export PYTHONPATH="${ROOT}/packages/model/src:${ROOT}/packages/engine/src:${ROOT}/packages/adapter-ray/src:${ROOT}/services/api/src:${ROOT}/services/collector/src"

if [[ "${MODE}" == "fixture" ]]; then
  echo "==> Fixture mode (no Ray): API on :${API_PORT}, UI on :${WEB_PORT}"
  cd "${ROOT}"
  API_PORT="${API_PORT}" uv run raywatch-api >"${RUN_DIR}/api.log" 2>&1 &
  echo $! >"${RUN_DIR}/api.pid"
else
  if [[ "${RAYWATCH_SKIP_LOCAL_RAY:-0}" == "1" ]]; then
    echo "==> Remote Ray mode (skip local Docker). Dashboard: ${DASHBOARD}"
  else
    echo "==> Starting Ray head (Docker) — Ray dashboard on :8265..."
    dc up -d ray-head
  fi

  echo "==> Waiting for Ray dashboard ${DASHBOARD}..."
  for _ in $(seq 1 60); do
    if curl -sf "${DASHBOARD}/api/version" >/dev/null; then
      break
    fi
    sleep 2
  done
  if ! curl -sf "${DASHBOARD}/api/version" >/dev/null; then
    echo "Ray dashboard not reachable at ${DASHBOARD}" >&2
    exit 1
  fi

  if [[ "${RAYWATCH_SKIP_LOCAL_RAY:-0}" != "1" && "${RAYWATCH_SKIP_DEMO_JOBS:-0}" != "1" ]]; then
    echo "==> Submitting demo Ray jobs (DEMO_RAY_JOBS=${DEMO_JOBS})..."
    DEMO_RAY_JOBS="${DEMO_JOBS}" "${ROOT}/scripts/demo_occupied_ray.sh"
  fi

  echo "==> Starting RayWatch API (live sync) on :${API_PORT}..."
  cd "${ROOT}"
  RAYWATCH_USE_LIVE=1 \
    RAYWATCH_FIXTURE_JOBS= \
    RAY_DASHBOARD_URL="${DASHBOARD}" \
    RAY_HEAD_API_URL="${DASHBOARD}" \
    API_PORT="${API_PORT}" \
    uv run raywatch-api >"${RUN_DIR}/api.log" 2>&1 &
  echo $! >"${RUN_DIR}/api.pid"
fi

echo "==> Waiting for API ${API_BASE}/health ..."
for _ in $(seq 1 45); do
  if curl -sf "${API_BASE}/health" >/dev/null; then
    break
  fi
  sleep 1
done
if ! curl -sf "${API_BASE}/health" >/dev/null; then
  echo "API failed to start. Log:" >&2
  tail -30 "${RUN_DIR}/api.log" >&2 || true
  exit 1
fi

if [[ "${MODE}" == "live" ]]; then
  echo "==> Waiting for first Ray sync (remote clusters can take 1–3 min)..."
  for _ in $(seq 1 90); do
    if curl -sf "${API_BASE}/ready" | python3 -c "import json,sys; exit(0 if json.load(sys.stdin).get('ready') else 1)" 2>/dev/null; then
      curl -sf "${API_BASE}/ready" | python3 -m json.tool 2>/dev/null | head -8
      break
    fi
    sleep 2
  done
  curl -sf -X POST "${API_BASE}/sync/trigger" >/dev/null || true
fi

print_banner() {
  echo ""
  echo "Ready — open in your browser:"
  echo "  RayWatch:       ${RW_JOBS_UI}"
  echo "  Ray Dashboard:  ${RAY_JOBS_UI}"
  echo ""
  echo "Stop everything:  make dev-down"
  echo ""
}

open_browsers() {
  [[ "${OPEN_BROWSER:-1}" == "0" ]] && return
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${RW_JOBS_UI}" >/dev/null 2>&1 || true
    xdg-open "${RAY_JOBS_UI}" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "${RW_JOBS_UI}" || true
    open "${RAY_JOBS_UI}" || true
  fi
}

if [[ "${DETACH}" -eq 1 ]]; then
  echo "==> Starting Vite (background) on :${WEB_PORT}..."
  cd "${ROOT}/apps/web"
  RAYWATCH_API_PROXY="${API_BASE}" \
    npm run dev -- --host 127.0.0.1 --port "${WEB_PORT}" >"${RUN_DIR}/web.log" 2>&1 &
  echo $! >"${RUN_DIR}/web.pid"

  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  print_banner
  open_browsers
  exit 0
fi

print_banner

cd "${ROOT}/apps/web"
RAYWATCH_API_PROXY="${API_BASE}" npm run dev -- --host 127.0.0.1 --port "${WEB_PORT}"
