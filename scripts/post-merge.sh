#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "Installing dependencies..."
npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -3

echo "Pushing database schema..."
npm run db:push 2>&1 | tail -5

echo "=== Post-merge setup complete ==="
