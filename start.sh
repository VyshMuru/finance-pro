#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║        Finance Pro — Local Setup         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Check Node ────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "❌  Node.js not found. Install it from https://nodejs.org (v18+)"
  exit 1
fi
NODE_VER=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌  Node.js v18+ required (found v${NODE_VER}). Please upgrade."
  exit 1
fi
echo "✅  Node.js v$(node -v | tr -d 'v') detected"

# ── Install root deps ─────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "📦  Installing root dependencies..."
  npm install --silent
fi

# ── Install server deps ───────────────────────────────────────
if [ ! -d "server/node_modules" ]; then
  echo "📦  Installing server dependencies (compiling native SQLite)..."
  cd server
  npm_config_nodedir="$(node -e "process.stdout.write(require('path').dirname(process.execPath) + '/../')")" \
    npm install --silent 2>/dev/null || npm install --silent
  cd ..
fi

# ── Install client deps ───────────────────────────────────────
if [ ! -d "client/node_modules" ]; then
  echo "📦  Installing client dependencies..."
  cd client && npm install --silent && cd ..
fi

# ── Seed DB if not exists ─────────────────────────────────────
if [ ! -f "server/finance.db" ]; then
  echo "🌱  Seeding database with sample data..."
  cd server && node db/seed.js && cd ..
fi

echo ""
echo "🚀  Starting Finance Pro..."
echo "   → Frontend: http://localhost:5173"
echo "   → API:      http://localhost:3001"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

# ── Start both servers ────────────────────────────────────────
npx concurrently \
  --names "API,UI" \
  --prefix-colors "cyan,green" \
  --kill-others-on-fail \
  "cd server && node server.js" \
  "cd client && npm run dev"
