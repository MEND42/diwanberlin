#!/usr/bin/env bash
# deploy.sh — Cafe Diwan production deploy script
# Runs on the VPS as the diwanberlin system user via GitHub Actions self-hosted runner.
# Follows VPS-CICD-Workflow.md §1.3 (Docker Compose project pattern).
set -euo pipefail

# Write all output to deploy log as well as stdout
exec > >(tee -a /var/log/deployments/diwanberlin.log) 2>&1

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3001/health}"
HEALTH_RETRIES=12
HEALTH_WAIT=5

echo "================================================================"
echo "[deploy] Cafe Diwan — Starting deploy at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[deploy] Dir: $PROJECT_DIR | Compose: $COMPOSE_FILE"
echo "================================================================"

cd "$PROJECT_DIR/backend"

# 1. Pull latest code
echo "[deploy] Pulling latest code..."
git -C "$PROJECT_DIR" fetch --all
git -C "$PROJECT_DIR" reset --hard origin/main

# 2. Copy frontend to nginx web root (static site)
echo "[deploy] Syncing frontend to /var/www/diwanberlin..."
rsync -av --delete \
  --exclude backend/ \
  --exclude .git/ \
  --exclude .github/ \
  --exclude node_modules/ \
  "$PROJECT_DIR/" /var/www/diwanberlin/
chown -R www-data:www-data /var/www/diwanberlin

# 3. Build Docker image
echo "[deploy] Building backend image..."
docker compose -f "$COMPOSE_FILE" build --no-cache

# 4. Run Prisma migrations (on the new image before cutover)
echo "[deploy] Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy

# 5. Deploy with zero-downtime
echo "[deploy] Bringing up services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 6. Health check with auto-rollback
echo "[deploy] Waiting for health check at $HEALTH_URL..."
for i in $(seq 1 $HEALTH_RETRIES); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "[deploy] ✓ Healthy after ${i} attempt(s)"
    echo "[deploy] Deploy complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    exit 0
  fi
  echo "[deploy] Attempt $i/$HEALTH_RETRIES failed, waiting ${HEALTH_WAIT}s..."
  sleep $HEALTH_WAIT
done

echo "[deploy] ✗ Health check failed after $((HEALTH_RETRIES * HEALTH_WAIT))s — rolling back"
git -C "$PROJECT_DIR" reset --hard HEAD~1
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
exit 1
