#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_VENV="$ROOT/backend/venv"
BACKEND_PY="$BACKEND_VENV/bin/python"
BACKEND_PIP="$BACKEND_VENV/bin/pip"
BACKEND_UVICORN="$BACKEND_VENV/bin/uvicorn"

cleanup() {
  echo ""
  echo "停止前后端..."
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ ! -d "$BACKEND_VENV" ]]; then
  echo "创建后端虚拟环境..."
  python3 -m venv "$BACKEND_VENV"
  echo "安装后端依赖..."
  "$BACKEND_PIP" install -r "$ROOT/backend/requirements.txt"
fi

echo "启动后端 http://localhost:8000 ..."
(
  cd "$ROOT/backend"
  "$BACKEND_UVICORN" app.main:app --reload --port 8000
) &
BACKEND_PID=$!

echo "启动前端..."
(
  cd "$ROOT/frontend"
  if [[ ! -d "node_modules" ]]; then
    npm install
  fi
  npm run dev
) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
