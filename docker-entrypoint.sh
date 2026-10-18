#!/bin/sh
set -eu

cd /app

echo "[Horizon Immo] Application des migrations Prisma..."
./node_modules/.bin/prisma migrate deploy

echo "[Horizon Immo] Initialisation des comptes et annonces..."
./node_modules/.bin/tsx prisma/seed.ts

echo "[Horizon Immo] Démarrage de Next.js..."
exec ./node_modules/.bin/next start \
  --hostname 0.0.0.0 \
  --port 3000
