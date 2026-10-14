#!/usr/bin/env bash
# RayWatch UI + API against a remote Ray dashboard (no local Docker Ray).
#
# Prerequisite: your machine can reach the Ray dashboard HTTP API, e.g.:
#   export RAY_DASHBOARD_URL=http://my-head.internal:8265
# or SSH tunnel:
#   ssh -N -L 8265:127.0.0.1:8265 user@remote-head
#   export RAY_DASHBOARD_URL=http://127.0.0.1:8265
#
# Usage:
#   RAY_DASHBOARD_URL=http://172.20.10.184:8265 ./scripts/dev-remote.sh --detach
#   ./scripts/dev-remote.sh --detach --no-fresh   # keep .dev/snapshots
#
# RayWatch ingest uses RAY_DASHBOARD_URL (HTTP API on the head). RAY_ADDRESS is for Ray CLI only.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DASHBOARD="${RAY_HEAD_API_URL:-${RAY_DASHBOARD_URL:-}}"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${RAYWATCH_WEB_PORT:-3000}"
DETACH=0
DO_FRESH=1

for arg in "$@"; do
  case "$arg" in
    --detach) DETACH=1 ;;
    --fresh) DO_FRESH=1 ;;
    --no-fresh) DO_FRESH=0 ;;
    -h | --help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${DASHBOARD}" ]]; then
  echo "Set RAY_DASHBOARD_URL to the remote Ray dashboard base URL (no trailing slash)." >&2
  echo "Example: RAY_DASHBOARD_URL=http://10.0.0.5:8265 $0 --detach" >&2
  exit 1
fi

DASHBOARD="${DASHBOARD%/}"
export RAYWATCH_SKIP_LOCAL_RAY=1
export RAYWATCH_SKIP_DEMO_JOBS=1
export RAY_DASHBOARD_URL="${DASHBOARD}"
export RAY_HEAD_API_URL="${DASHBOARD}"
unset DATABASE_URL 2>/dev/null || true
export RAYWATCH_SNAPSHOT_DIR="${RAYWATCH_SNAPSHOT_DIR:-${ROOT}/.dev/snapshots}"
export RAYWATCH_JOB_ENRICH_MAX="${RAYWATCH_JOB_ENRICH_MAX:-32}"

if [[ "${DO_FRESH}" -eq 1 ]]; then
  "${ROOT}/scripts/dev-fresh-local-state.sh"
fi
"${ROOT}/scripts/port-hygiene.sh" 2>/dev/null || true

echo "==> Checking Ray head HTTP API ${DASHBOARD} ..."
if ! curl -sf "${DASHBOARD}/api/version" >/dev/null; then
  echo "Cannot reach ${DASHBOARD}/api/version — fix network, firewall, or use SSH port-forward." >&2
  exit 1
fi
curl -sf "${DASHBOARD}/api/version" | head -c 200
echo ""
echo "==> (Optional) Ray built-in UI: ${DASHBOARD}/#/jobs — you use RayWatch at http://127.0.0.1:${WEB_PORT}"
echo ""

if [[ "${DETACH}" -eq 1 ]]; then
  exec "${ROOT}/scripts/dev-up.sh" --detach
else
  exec "${ROOT}/scripts/dev-up.sh"
fi
