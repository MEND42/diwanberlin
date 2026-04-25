#!/usr/bin/env bash
# vps-setup.sh — One-time VPS setup for Cafe Diwan
# Run this as ROOT on VPS 72.62.46.132
# Follows VPS-SOP.md §5 (Deploying a New Project — Full Checklist)
# ============================================================================
set -euo pipefail

echo "================================================================"
echo "  Cafe Diwan — VPS Setup (Port 3001, User: diwanberlin)"
echo "  Server: 72.62.46.132"
echo "================================================================"

# ── 1. Create system user (no login shell — Docker project pattern) ──────────
echo ""
echo "[1/9] Creating system user 'diwanberlin'..."
if id "diwanberlin" &>/dev/null; then
  echo "  User already exists, skipping."
else
  useradd -r -s /usr/sbin/nologin -M -d /opt/diwanberlin diwanberlin
  usermod -aG docker diwanberlin
  echo "  User created and added to docker group."
fi

# ── 2. Create project directories ─────────────────────────────────────────────
echo ""
echo "[2/9] Creating project directories..."
mkdir -p /opt/diwanberlin
mkdir -p /var/www/diwanberlin
mkdir -p /var/log/deployments
chown -R diwanberlin:diwanberlin /opt/diwanberlin
chown -R www-data:www-data /var/www/diwanberlin
chmod 755 /var/log/deployments
echo "  /opt/diwanberlin     → diwanberlin:diwanberlin"
echo "  /var/www/diwanberlin → www-data:www-data"

# ── 3. Clone repo from GitHub ──────────────────────────────────────────────────
echo ""
echo "[3/9] Cloning repository..."
if [ -d "/opt/diwanberlin/.git" ]; then
  echo "  Repo already cloned, pulling latest..."
  sudo -u diwanberlin git -C /opt/diwanberlin pull
else
  sudo -u diwanberlin git clone https://github.com/MEND42/diwanberlin.git /opt/diwanberlin
fi

# ── 4. Create .env on VPS (secrets stay here, never in git) ───────────────────
echo ""
echo "[4/9] Creating .env file..."
if [ -f /opt/diwanberlin/backend/.env ]; then
  echo "  .env already exists — not overwriting. Edit manually if needed."
else
  cat > /opt/diwanberlin/backend/.env << 'ENVEOF'
NODE_ENV=production
PORT=3001

# PostgreSQL
DATABASE_URL=postgresql://diwanuser:CHANGE_ME_DB_PASS@db:5432/diwandb
POSTGRES_USER=diwanuser
POSTGRES_PASSWORD=CHANGE_ME_DB_PASS
POSTGRES_DB=diwandb

# JWT — generate with: openssl rand -hex 64
JWT_SECRET=CHANGE_ME_JWT_SECRET

# Email (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=info@diwanberlin.com
SMTP_PASS=CHANGE_ME_EMAIL_PASS
SMTP_FROM=Cafe Diwan <info@diwanberlin.com>
ENVEOF

  chmod 600 /opt/diwanberlin/backend/.env
  chown diwanberlin:diwanberlin /opt/diwanberlin/backend/.env
  echo ""
  echo "  ⚠️  .env created at /opt/diwanberlin/backend/.env"
  echo "  ⚠️  YOU MUST update: POSTGRES_PASSWORD, JWT_SECRET, SMTP_PASS"
  echo "  ⚠️  Run: nano /opt/diwanberlin/backend/.env"
fi

# ── 5. Set deploy script permissions ─────────────────────────────────────────
echo ""
echo "[5/9] Setting deploy.sh permissions..."
chmod 750 /opt/diwanberlin/deploy.sh
chown diwanberlin:diwanberlin /opt/diwanberlin/deploy.sh

# Also allow diwanberlin user to rsync to /var/www/diwanberlin (for deploy.sh)
echo "  Granting rsync write access to /var/www/diwanberlin..."
chown -R diwanberlin:www-data /var/www/diwanberlin
chmod -R g+w /var/www/diwanberlin

# ── 6. Install systemd service ────────────────────────────────────────────────
echo ""
echo "[6/9] Installing systemd service..."
cp /opt/diwanberlin/diwanberlin.service /etc/systemd/system/diwanberlin.service
systemctl daemon-reload
systemctl enable diwanberlin
echo "  Service installed and enabled."

# ── 7. Install Nginx vhost ────────────────────────────────────────────────────
echo ""
echo "[7/9] Installing Nginx vhost..."
cp /opt/diwanberlin/nginx.conf /etc/nginx/sites-available/diwanberlin
if [ ! -L /etc/nginx/sites-enabled/diwanberlin ]; then
  ln -s /etc/nginx/sites-available/diwanberlin /etc/nginx/sites-enabled/diwanberlin
fi
nginx -t
systemctl reload nginx
echo "  Nginx vhost installed and reloaded."

# ── 8. Issue SSL certificate ──────────────────────────────────────────────────
echo ""
echo "[8/9] Issuing SSL certificate..."
echo "  Checking DNS first..."
if dig +short diwanberlin.com | grep -q "72.62.46.132"; then
  certbot certonly --nginx -d diwanberlin.com -d www.diwanberlin.com --non-interactive --agree-tos -m info@diwanberlin.com
  # Reload nginx to use the cert
  nginx -t && systemctl reload nginx
  echo "  SSL certificate issued successfully."
else
  echo "  ⚠️  DNS not yet resolving to 72.62.46.132. Skipping certbot."
  echo "  ⚠️  Once DNS is live, run:"
  echo "        certbot certonly --nginx -d diwanberlin.com -d www.diwanberlin.com"
  echo "        nginx -t && systemctl reload nginx"
fi

# ── 9. Register GitHub Actions runner ────────────────────────────────────────
echo ""
echo "[9/9] GitHub Actions runner setup..."
RUNNER_DIR=/opt/diwanberlin/.runner

if [ -d "$RUNNER_DIR" ] && [ -f "$RUNNER_DIR/.runner" ]; then
  echo "  Runner already registered, skipping."
else
  echo "  Copying runner binary..."
  mkdir -p "$RUNNER_DIR"
  cp -a /opt/actions-runner-pkg/. "$RUNNER_DIR/"
  chown -R diwanberlin:diwanberlin "$RUNNER_DIR"

  echo ""
  echo "  ════════════════════════════════════════════════════════"
  echo "  MANUAL STEP REQUIRED — Runner Registration"
  echo "  ════════════════════════════════════════════════════════"
  echo "  1. Go to: https://github.com/MEND42/diwanberlin/settings/actions/runners/new"
  echo "  2. Copy the registration token shown on that page."
  echo "  3. Then run these commands on the VPS:"
  echo ""
  echo "     RUNNER_TOKEN=<PASTE_TOKEN_HERE>"
  echo "     sudo -u diwanberlin $RUNNER_DIR/config.sh \\"
  echo "       --url https://github.com/MEND42/diwanberlin \\"
  echo "       --token \$RUNNER_TOKEN \\"
  echo "       --name diwanberlin-vps \\"
  echo "       --labels diwanberlin-vps \\"
  echo "       --work $RUNNER_DIR/_work \\"
  echo "       --unattended --replace"
  echo ""
  echo "     $RUNNER_DIR/svc.sh install diwanberlin"
  echo "     systemctl enable --now 'actions.runner.MEND42-diwanberlin.diwanberlin-vps.service'"
  echo "  ════════════════════════════════════════════════════════"
fi

echo ""
echo "================================================================"
echo "  Setup complete!"
echo ""
echo "  NEXT STEPS:"
echo "  1. Edit /opt/diwanberlin/backend/.env (fill in real secrets)"
echo "  2. Start the backend: systemctl start diwanberlin"
echo "  3. Verify: systemctl is-active diwanberlin"
echo "  4. Verify: docker ps (should show diwanberlin-api and diwanberlin-postgres)"
echo "  5. Test health: curl http://127.0.0.1:3001/health"
echo "  6. Register the GitHub Actions runner (see step 9 output above)"
echo "  7. On GitHub: Settings → Environments → New: 'production'"
echo "     Add yourself as required reviewer."
echo "  8. Push to main → PR → merge → watch auto-deploy!"
echo "================================================================"
