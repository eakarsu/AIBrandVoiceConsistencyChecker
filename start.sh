#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$project_dir"
if [ ! -f .env ]; then echo "Missing .env; copy .env.example and configure it." >&2; exit 1; fi
if [ ! -d node_modules ] || [ ! -d client/node_modules ]; then echo "Dependencies are absent; run scripts/bootstrap.sh first." >&2; exit 1; fi
set -a; . ./.env; set +a
server_port="${PORT:-3001}"; client_port="${CLIENT_PORT:-3000}"
for port in "$server_port" "$client_port"; do if command -v lsof >/dev/null && lsof -ti ":$port" >/dev/null 2>&1; then echo "Port $port is already in use; refusing to stop another process." >&2; exit 1; fi; done
npm start & server_pid=$!
(cd client && npm run dev -- --port "$client_port") & client_pid=$!
cleanup(){ kill "$server_pid" "$client_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$server_pid" "$client_pid"
