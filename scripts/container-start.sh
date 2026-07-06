#!/bin/sh
set -eu

ROLE="${APP_ROLE:-web}"

echo "[container] Starting role: ${ROLE}"

if [ "${ROLE}" = "web" ] && [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[container] Running prisma migrations"
  npx prisma migrate deploy
fi

if [ "${ROLE}" = "web" ]; then
  exec npm run start
fi

if [ "${ROLE}" = "worker" ]; then
  exec npm run worker:streams
fi

echo "[container] Unknown APP_ROLE: ${ROLE}"
exit 1
