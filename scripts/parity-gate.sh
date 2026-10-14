#!/usr/bin/env bash
# Full parity + NFR gate: perf baselines, Ray warm comparison, live integration, live UI e2e.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

echo "==> 1/4 make perf (read paths + feature latency registry)"
make perf

echo "==> 2/4 make benchmark-ray-assert (RayWatch warm vs Ray jobs API)"
make benchmark-ray-assert

echo "==> 3/4 verify-live (integration + demo logs + benchmark sample)"
make verify-live

echo "==> 4/4 make test-e2e (Playwright on live Ray)"
make test-e2e

echo "==> parity-gate OK"
echo "Registry: benchmark-results/feature-latency-registry.md"
echo "Ray compare: benchmark-results/jobs-list-latency.md"
echo "Matrix: docs/ray-dashboard-feature-matrix.md"
