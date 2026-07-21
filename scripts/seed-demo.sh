#!/usr/bin/env bash
set -euo pipefail
if [ "${CONFIRM_DESTRUCTIVE_DEMO_SEED:-}" != "yes" ]; then echo "Refusing destructive demo seed. Set CONFIRM_DESTRUCTIVE_DEMO_SEED=yes explicitly." >&2; exit 1; fi
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$project_dir"; node server/seed.js
