#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ "${1:-}" == '--help' ]]; then echo 'Usage: ./setup.sh [config.json]'; exit 0; fi
command -v node >/dev/null || { echo 'Install Node.js 24.22.2+ first. See README.md.' >&2; exit 1; }
command -v pi >/dev/null || { echo 'Pi must already be installed and on PATH. See README.md.' >&2; exit 1; }
exec node "$ROOT/scripts/setup.mjs" "$@"
