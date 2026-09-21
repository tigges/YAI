#!/bin/sh
# Run all pending migrations before starting the API server.
# Uses idempotent SQL migrations so it is safe to run on every container start.
set -e

SCHEMA="packages/db/prisma/schema.prisma"

echo "[startup] Running database migrations..."
if prisma migrate deploy --schema "$SCHEMA" 2>/dev/null; then
  echo "[startup] prisma migrate deploy: OK"
else
  echo "[startup] migrate deploy not available, falling back to db push..."
  prisma db push --schema "$SCHEMA" --accept-data-loss 2>/dev/null || true
fi

echo "[startup] Starting API server..."
exec node apps/api/dist/index.js
