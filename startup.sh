#!/bin/sh
set -eu
cd /workspace
node scripts/preview.mjs stop || true
if [ ! -f public/tfjs/tfjs-backend-wasm.wasm ]; then
  node scripts/copy-tfjs-wasm.mjs
fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:3000/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
