#!/usr/bin/env bash
exec "$(cd "$(dirname "$0")/.." && pwd)/scripts/dev-clean.sh" "$@"
