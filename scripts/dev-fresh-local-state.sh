#!/usr/bin/env bash
# Wipe RayWatch local durable scratch (not your remote Ray cluster).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="${RAYWATCH_SNAPSHOT_DIR:-${ROOT}/.dev/snapshots}"

echo "==> Removing local RayWatch state:"
echo "    ${ROOT}/.dev/run"
echo "    ${SNAP}"
rm -rf "${ROOT}/.dev/run" "${ROOT}/.dev/e2e"
rm -rf "${SNAP}"
echo "==> Done (in-memory cache clears when API restarts)."
