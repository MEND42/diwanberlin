# VPS Standard Operating Procedure
**Server:** 72.62.46.132 — Ubuntu 22.04 LTS — 2 vCPU / 7.8 GB RAM / 97 GB disk  
**Last updated:** 2026-04-25

---

## Table of Contents

1. [Project Registry](#1-project-registry)
2. [Port Allocation](#2-port-allocation)
3. [User & Permission Model](#3-user--permission-model)
4. [Two Deployment Patterns](#4-two-deployment-patterns)
5. [Deploying a New Project — Full Checklist](#5-deploying-a-new-project--full-checklist)
6. [Updating an Existing Project](#6-updating-an-existing-project)
7. [Nginx Standards](#7-nginx-standards)
8. [SSL / Certbot](#8-ssl--certbot)
9. [Environment Variables & Secrets](#9-environment-variables--secrets)
10. [Logging & Log Rotation](#10-logging--log-rotation)
11. [Monitoring](#11-monitoring)
12. [Docker Compose Standards](#12-docker-compose-standards)
13. [PM2 Standards](#13-pm2-standards)
14. [Security Rules](#14-security-rules)
15. [Backup & Recovery](#15-backup--recovery)
16. [Hard Rules — Never Do These](#16-hard-rules--never-do-these)
17. [Incident Response Checklist](#17-incident-response-checklist)

---

## 1. Project Registry

| Project | Domain(s) | Type | User | Dir | Port | Systemd service |
|---|---|---|---|---|---|---|
| AuraConnect | aura-connect.cloud, admin.aura-connect.cloud | PM2 (Node.js) | `auraconnect` | `/home/auraconnect/AuraConnect` | 5001 | `pm2-auraconnect` |
| Afghan Diaspora Map | afghan.gandomai.cloud | Docker Compose | `afghan` | `/opt/AfghanDiasporaMap` | 5005 | `afghan-diaspora` |
| Yadex | yadex.aura-connect.cloud | Docker Compose | `yadex` | `/opt/yadex/backend` | 8000 | `yadex` |
| Gandom AI | gandomai.com | Docker Compose | `gandomai` | `/var/www/gandom-ai` | 3000 | `gandom-ai` |
| Viamates | — (infra only) | Docker Compose | `viamates` | `/opt/viamates` | — | `viamates` |
| QawmaBerlin | qawmaberlin.de | Static (nginx) | `501/staff` | `/var/www/qawmaberlin` | — | — |
| DiwanBerlin | diwanberlin.com | Static (nginx) | `www-data` | `/var/www/diwanberlin` | — | — |
| Gandom AI Cloud | gandomai.cloud | Static + API proxy | nginx | `/var/www/yadex-web` | 8000 | — |
| Netdata | monitor.gandomai.cloud | Internal | `netdata` | `/var/lib/netdata` | 19999 | `netdata` |

**When you add a project, update this table first.**

---

## 2. Port Allocation

Keep this map updated. Never bind two services to the same host port.

| Port | Service | Binding |
|---|---|---|
| 80 | nginx (HTTP → HTTPS redirect) | 0.0.0.0 |
| 443 | nginx (HTTPS) | 0.0.0.0 |
| 3000 | gandom-ai container | 127.0.0.1 only |
| 5001 | AuraConnect PM2 | 127.0.0.1 only |
| 5005 | Afghan Diaspora container | 127.0.0.1 only |
| 5432 | yadex-postgres container | 127.0.0.1 only |
| 5433 | host PostgreSQL | 127.0.0.1 only |
| 6379 | yadex-redis container | 127.0.0.1 only |
| 8000 | yadex-api container | 127.0.0.1 only |
| 8080 | nginx (viamates placeholder) | 0.0.0.0 |
| 8085 | pgAdmin container | 127.0.0.1 only |
| 19999 | Netdata | 127.0.0.1 only |
| 27017 | MongoDB | 127.0.0.1 only |
| 29092 | Redpanda (Kafka) | 127.0.0.1 only |

**Rule:** Every application port must bind to `127.0.0.1`, never `0.0.0.0`. Only nginx binds publicly on 80 and 443.

**Next available ports (reserve in order):** 3001, 3002, 5006, 5007, 8001, 8002

---

## 3. User & Permission Model

### Principle
Every project runs as its own dedicated system user with no login shell. No project ever runs as `root`.

### Existing users

| User | UID | Home / Project dir | Shell | Groups |
|---|---|---|---|---|
| `auraconnect` | 1001 | `/home/auraconnect` | `/bin/bash` | `auraconnect` |
| `afghan` | 997 | `/opt/AfghanDiasporaMap` | `/usr/sbin/nologin` | `afghan`, `docker` |
| `yadex` | 996 | `/opt/yadex` | `/usr/sbin/nologin` | `yadex`, `docker` |
| `gandomai` | 995 | `/var/www/gandom-ai` | `/usr/sbin/nologin` | `gandomai`, `docker` |
| `viamates` | 994 | `/opt/viamates` | `/usr/sbin/nologin` | `viamates`, `docker` |

### Creating a user for a new project

```bash
# For Docker-based project (needs docker group)
useradd -r -s /usr/sbin/nologin -M -d /opt/PROJECTNAME PROJECTNAME
usermod -aG docker PROJECTNAME
chown -R PROJECTNAME:PROJECTNAME /opt/PROJECTNAME

# For PM2/Node.js project (needs a real home for PM2 state)
useradd -m -s /bin/bash -d /home/PROJECTNAME PROJECTNAME
chown -R PROJECTNAME:PROJECTNAME /home/PROJECTNAME
```

### Directory ownership rules

| Location | Owner | When to use |
|---|---|---|
| `/opt/PROJECTNAME` | `PROJECTNAME:PROJECTNAME` | Docker Compose projects |
| `/var/www/PROJECTNAME` | `PROJECTNAME:PROJECTNAME` | Web app / Next.js projects |
| `/home/PROJECTNAME` | `PROJECTNAME:PROJECTNAME` | PM2 projects |
| `/var/www/STATICNAME` | `www-data:www-data` | Pure static sites served by nginx |

---

## 4. Two Deployment Patterns

### Pattern A — Docker Compose (preferred for new projects)

Use when: the project has its own server process (Node.js, Python, Go), or needs a database/queue bundled with it.

**Directory structure:**
```
/opt/PROJECTNAME/
├── docker-compose.yml          # or docker-compose.prod.yml
├── docker-compose.infra.yml    # optional: infra-only (postgres, redis) for partial deployments
├── .env                        # secrets — chmod 600, owned by PROJECTNAME
├── Dockerfile                  # if building a custom image
└── ...source or config files
```

**Mandatory docker-compose rules** (see Section 12 for full detail):
- All host port bindings use `127.0.0.1:HOST_PORT:CONTAINER_PORT`
- All stateful services have named volumes
- All services have `restart: unless-stopped`
- All services have a `healthcheck`
- Secrets come from `env_file: .env`, never hardcoded

**Systemd service** (`/etc/systemd/system/PROJECTNAME.service`):
```ini
[Unit]
Description=PROJECTNAME (Docker Compose)
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=PROJECTNAME
Group=docker
WorkingDirectory=/opt/PROJECTNAME

ExecStart=/usr/bin/docker compose -f docker-compose.yml up -d --remove-orphans
ExecStop=/usr/bin/docker compose -f docker-compose.yml down
ExecReload=/usr/bin/docker compose -f docker-compose.yml pull && \
           /usr/bin/docker compose -f docker-compose.yml up -d --remove-orphans

TimeoutStartSec=300
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now PROJECTNAME
```

### Pattern B — PM2 (Node.js without Docker)

Use when: the project is a single Node.js process with no containerised dependencies.

**Directory structure:**
```
/home/PROJECTNAME/PROJECTNAME/
├── ecosystem.config.js    # PM2 config
├── .env                   # secrets — chmod 600
└── src/
    └── server.js
```

**ecosystem.config.js template:**
```js
module.exports = {
  apps: [{
    name: 'PROJECTNAME',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    user: 'PROJECTNAME',
    env_file: '.env',
    error_file: '/home/PROJECTNAME/.pm2/logs/PROJECTNAME-error.log',
    out_file:   '/home/PROJECTNAME/.pm2/logs/PROJECTNAME-out.log',
    merge_logs: true,
    max_memory_restart: '500M',
  }]
};
```

**Systemd service:**
```bash
# Run as the project user, not root
su - PROJECTNAME -c "pm2 start ecosystem.config.js"
su - PROJECTNAME -c "pm2 save"
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd \
  -u PROJECTNAME --hp /home/PROJECTNAME
```

---

## 5. Deploying a New Project — Full Checklist

Work through every item in order. Check off as you go.

### Pre-deployment

- [ ] Assign a domain / subdomain
- [ ] Create DNS A record pointing to `72.62.46.132`
- [ ] Choose a deployment pattern (Docker Compose or PM2)
- [ ] Choose an unused port from Section 2; add it to the port map
- [ ] Create system user (`useradd ...`)
- [ ] Create project directory under the correct root (`/opt/`, `/var/www/`, or `/home/`)
- [ ] Set directory ownership (`chown -R PROJECTNAME:PROJECTNAME /path`)
- [ ] Write `.env` with all secrets; `chmod 600 .env`

### Docker Compose projects

- [ ] Write `docker-compose.yml` following Section 12 rules
- [ ] Ensure ALL ports bind `127.0.0.1:PORT:PORT` (never bare `PORT:PORT`)
- [ ] Add named volumes for every stateful directory (uploads, DB data, etc.)
- [ ] Add `uploads-init` one-shot service if the image bakes in static files that need to persist (see Gandom AI lesson)
- [ ] Write systemd service (`/etc/systemd/system/PROJECTNAME.service`)
- [ ] `systemctl daemon-reload && systemctl enable --now PROJECTNAME`
- [ ] Verify: `systemctl is-active PROJECTNAME` → `active`
- [ ] Verify: `docker ps` shows all containers healthy

### Nginx

- [ ] Create `/etc/nginx/sites-available/PROJECTNAME` using the template in Section 7
- [ ] Add `include /etc/nginx/snippets/security-headers.conf;` in the HTTPS server block
- [ ] Add CSP to every `location` block that has its own `add_header` directive
- [ ] `ln -s /etc/nginx/sites-available/PROJECTNAME /etc/nginx/sites-enabled/PROJECTNAME`
- [ ] `nginx -t` → must say `syntax is ok`
- [ ] `systemctl reload nginx`

### SSL

- [ ] Confirm DNS is resolving: `dig +short YOURDOMAIN`
- [ ] `certbot certonly --nginx -d YOURDOMAIN`
- [ ] Update nginx vhost to reference the new cert path
- [ ] `nginx -t && systemctl reload nginx`
- [ ] `certbot renew --dry-run` → all certs must pass

### Post-deployment verification

- [ ] `curl -Is https://YOURDOMAIN/ | head -5` → HTTP 200 or 301
- [ ] Check security headers: `curl -Is https://YOURDOMAIN/ | grep -i "content-security\|x-frame\|strict-transport"`
- [ ] Check port not exposed externally: `curl http://127.0.0.1:PORT/health` works; `curl http://72.62.46.132:PORT` fails
- [ ] Check container/process logs for startup errors
- [ ] Update **Project Registry** and **Port Allocation** tables in this document

---

## 6. Updating an Existing Project

### Docker Compose project update

```bash
# 1. Pull new image (if using a registry) or rebuild
cd /opt/PROJECTNAME
docker compose -f docker-compose.prod.yml pull          # if using pre-built image
# OR
docker compose -f docker-compose.prod.yml build --no-cache app  # if building locally

# 2. Reload with zero-downtime (if multiple replicas)
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 3. Verify
docker ps
docker logs CONTAINER_NAME --tail 30
```

### PM2 project update (AuraConnect pattern)

```bash
# As the project user
su - auraconnect -c "
  cd /home/auraconnect/AuraConnect/backend
  git pull
  npm install --production
  pm2 reload auraconnect-backend
"

# Verify
su - auraconnect -c "pm2 list"
```

### Static site update (QawmaBerlin / DiwanBerlin pattern)

```bash
# Build locally, then rsync or copy dist/
rsync -av --delete ./dist/ /var/www/PROJECTNAME/
chown -R www-data:www-data /var/www/PROJECTNAME   # or correct owner
```

### Nginx config change

```bash
# Always test before reload
nginx -t && systemctl reload nginx
# Never use restart unless reload fails — restart drops active connections
```

### Cert renewal (automatic, but if manual is needed)

```bash
certbot renew --dry-run   # test first
certbot renew             # then run for real if dry-run passes
systemctl reload nginx
```

---

## 7. Nginx Standards

### File locations

| File | Purpose |
|---|---|
| `/etc/nginx/nginx.conf` | Global settings (`server_tokens off` lives here) |
| `/etc/nginx/sites-available/PROJECTNAME` | Site config (source of truth) |
| `/etc/nginx/sites-enabled/PROJECTNAME` | Symlink to sites-available |
| `/etc/nginx/sites-enabled/00-default-deny` | Catch-all: returns 444 for unknown hosts |
| `/etc/nginx/snippets/security-headers.conf` | CSP header — included in every HTTPS block |

### HTTPS vhost template

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN www.DOMAIN;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN www.DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers (CSP is in this snippet)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    include /etc/nginx/snippets/security-headers.conf;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    access_log /var/log/nginx/PROJECTNAME-access.log;
    error_log  /var/log/nginx/PROJECTNAME-error.log warn;
}
```

### CSP inheritance rule (critical)

nginx's `add_header` is **not inherited** by child `location` blocks that define their own `add_header`. If a location block sets `Cache-Control`, it must also re-include the CSP snippet:

```nginx
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    include /etc/nginx/snippets/security-headers.conf;   # <-- required here too
}
```

### Upload / media proxy settings

For routes that serve large files or videos:

```nginx
location /uploads {
    proxy_pass http://127.0.0.1:PORT;
    proxy_buffering off;
    proxy_request_buffering off;
    client_max_body_size 100M;
}
```

---

## 8. SSL / Certbot

### Renewal timer

Certbot runs automatically twice daily via systemd timer:

```bash
systemctl status certbot.timer      # confirm Active: active (waiting)
certbot renew --dry-run             # test all certs before any deploy
```

### Issue a cert for a new domain

```bash
# DNS must resolve first — always verify before running certbot
dig +short NEWDOMAIN

certbot certonly --nginx -d NEWDOMAIN [-d www.NEWDOMAIN]
# Then update the nginx vhost ssl_certificate path and reload
```

### Adding a subdomain to an existing cert

```bash
certbot certonly --nginx --expand -d EXISTINGDOMAIN -d NEWSUBDOMAIN
```

### Cert expiry monitoring

Netdata alerts on cert expiry. Additionally, check manually:

```bash
certbot certificates
```

Current cert expiry dates are in Section 1. The soonest expiry is `yadex.aura-connect.cloud` (2026-06-19 — 54 days from this writing).

---

## 9. Environment Variables & Secrets

### Rules

1. **Never commit `.env` files** to git. Add `.env*` to `.gitignore` on every project.
2. **Never hardcode secrets** in `docker-compose.yml`. Use `${VAR:-fallback}` and load from `.env`.
3. **Every `.env` file must be `chmod 600`** and owned by the project user.
4. **Secrets must live only on the server**, never in CI/CD environment variables unless the CI provider offers encrypted secrets.

### Standard `.env` locations and permissions

```bash
# Set immediately after creating the file
chmod 600 /opt/PROJECTNAME/.env
chown PROJECTNAME:PROJECTNAME /opt/PROJECTNAME/.env
```

### Known `.env` files on this server

```
/opt/AfghanDiasporaMap/.env          (afghan:afghan, 600)
/opt/viamates/.env                    (viamates:viamates, 600)
/home/auraconnect/AuraConnect/backend/.env  (auraconnect:auraconnect, 600)
/var/www/gandom-ai/.env.docker        (gandomai:gandomai, 600)
/var/www/gandom-ai/.env.local         (gandomai:gandomai, 600)
/opt/yadex/backend/.env               (yadex:yadex, 600)
```

### Docker Compose secrets pattern

```yaml
services:
  api:
    env_file: .env               # load from .env file
    environment:
      # Override or add non-secret config inline
      NODE_ENV: production
      PORT: "3000"
      # Secrets via variable expansion from .env
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
```

---

## 10. Logging & Log Rotation

### PM2 logs

PM2 log rotation is handled by `pm2-logrotate` (installed, running as root PM2 module):

```bash
pm2 get pm2-logrotate       # view settings
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

Log files: `/home/PROJECTNAME/.pm2/logs/`

If a log grows too large before rotation triggers, truncate safely:
```bash
truncate -s 0 /home/auraconnect/.pm2/logs/auraconnect-backend-error.log
# truncate preserves the open file descriptor — running process is not disrupted
```

### Docker logs

Docker uses the default `json-file` driver. Limit log size per container in `docker-compose.yml`:

```yaml
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
```

Add this block to every service in every `docker-compose.yml`. Without it, container logs grow unboundedly.

### Nginx logs

Nginx logs are in `/var/log/nginx/`. logrotate (system) handles them daily.

To watch live errors across all sites:
```bash
tail -f /var/log/nginx/*-error.log
```

---

## 11. Monitoring

### Netdata dashboard

- **URL:** https://monitor.gandomai.cloud (once DNS `monitor.gandomai.cloud → 72.62.46.132` is created and cert issued)
- **Login:** `admin` / (password in `/etc/nginx/.netdata_htpasswd`)
- **Listens:** `127.0.0.1:19999` (not publicly exposed)

### Alert thresholds (customised)

| Metric | Warning | Critical |
|---|---|---|
| Load average 15m | > 3.0 (150% × 2 CPUs) | > 4.0 (200%) |
| Load average 5m | > 6.0 | > 8.0 |
| RAM in use | > 80% | > 90% |
| Disk space | > 80% | > 90% |
| OOM kills | > 0 in 30m | — |

Config: `/etc/netdata/health.d/load_custom.conf`

### Alert notifications

Alerts go to `gandom.ai.24@gmail.com` via msmtp (Gmail SMTP).

**To activate email alerts**, set the Gmail App Password:
```bash
# Get App Password: myaccount.google.com → Security → App passwords
nano /etc/msmtprc                        # set: password YOUR_APP_PASSWORD
nano /var/lib/netdata/.msmtprc           # same password in netdata's copy
# Test:
sudo -u netdata /usr/lib/netdata/plugins.d/alarm-notify.sh test
```

### Quick health commands

```bash
# Overall load and memory
uptime && free -h

# All project services
systemctl is-active pm2-auraconnect afghan-diaspora yadex gandom-ai viamates

# All containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Disk usage (top 10 directories)
du -sh /opt/* /var/www/* /home/* /var/log /var/lib/docker 2>/dev/null | sort -rh | head -15

# Nginx errors in the last 5 minutes
find /var/log/nginx -name "*error*" -newer /tmp/5mago -exec tail -20 {} \; 2>/dev/null \
  || tail -50 /var/log/nginx/error.log
```

---

## 12. Docker Compose Standards

Every `docker-compose.yml` on this server must follow these rules.

### Template with all required fields

```yaml
# No 'version:' key — it's obsolete in Compose v2 and generates warnings

services:
  api:
    image: myimage:v1.2.3          # always pin a version, never use :latest in production
    container_name: PROJECTNAME-api
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:PORT:PORT"      # REQUIRED: always 127.0.0.1 prefix
    volumes:
      - uploads:/app/public/uploads  # named volume for persistence
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:PORT/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15-alpine
    container_name: PROJECTNAME-postgres
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:5432:5432"      # only if host access is needed; omit otherwise
    volumes:
      - postgres_data:/var/lib/postgresql/data
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  uploads:
```

### Upload volume pattern (critical — learned from Gandom AI incident)

If your Docker image bakes in files that need to persist (e.g., seed images, initial uploads), add an init service that seeds the host directory before the app starts. Without this, the bind mount shadows the image files and they become invisible:

```yaml
services:
  uploads-init:
    image: myimage:v1.2.3
    container_name: PROJECTNAME-uploads-init
    restart: "no"
    user: root
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        if [ -z "$(ls -A /dest)" ]; then
          cp -a /app/public/uploads/. /dest/
          echo "Seeded $(ls /dest | wc -l) files."
        fi
    volumes:
      - ./uploads:/dest

  app:
    depends_on:
      uploads-init:
        condition: service_completed_successfully
    volumes:
      - ./uploads:/app/public/uploads
```

---

## 13. PM2 Standards

Currently only AuraConnect uses PM2 directly. For new Node.js projects prefer Docker Compose.

### PM2 daemon per user, never root

Each PM2-managed project must have its own PM2 daemon running as the project user, with its own systemd service:

```
pm2-auraconnect.service  →  User=auraconnect  PM2_HOME=/home/auraconnect/.pm2
pm2-root.service         →  User=root         (pm2-logrotate module only — no apps)
```

### Adding a new PM2 app

```bash
su - PROJECTNAME
cd /home/PROJECTNAME/PROJECTNAME
pm2 start ecosystem.config.js
pm2 save
exit

# Generate systemd service (one-time per user)
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd \
  -u PROJECTNAME --hp /home/PROJECTNAME
systemctl enable pm2-PROJECTNAME
```

### Log rotation for PM2

`pm2-logrotate` is installed globally under root PM2.  
Max file size: **10 MB**, retain: **30 files**.

Reconfigure:
```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## 14. Security Rules

### Network exposure

- **Rule:** Only ports 22, 80, and 443 are publicly reachable. Everything else binds to `127.0.0.1`.
- **Verify:** `ss -tlnp | grep -v "127.0.0.1\|::1\|[::1]"` — should show only ssh, nginx.
- **Test after every deploy:** `curl http://72.62.46.132:APP_PORT` must fail/timeout from outside.

### nginx hardening (already in place, verify on new sites)

```bash
grep "server_tokens" /etc/nginx/nginx.conf      # must be: server_tokens off;
ls /etc/nginx/sites-enabled/00-default-deny     # catch-all must exist
```

### CSP — Content Security Policy

Global policy is in `/etc/nginx/snippets/security-headers.conf`. Include it in every HTTPS server block. If the policy needs tightening for a specific site, override it in that site's server block:

```nginx
# Example: stricter policy for a static-only site (no inline scripts)
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'" always;
```

### File permissions checklist

```bash
# Run this after any deployment
chmod 600 /opt/PROJECTNAME/.env
chown -R PROJECTNAME:PROJECTNAME /opt/PROJECTNAME
# Verify no world-writable files
find /opt/PROJECTNAME /var/www/PROJECTNAME -perm -o+w 2>/dev/null
```

### Fail2Ban

Fail2Ban is running (`systemctl is-active fail2ban`). Do not disable it. Check banned IPs:
```bash
fail2ban-client status sshd
```

---

## 15. Backup & Recovery

### What needs backing up

| Data | Location | Backup method |
|---|---|---|
| PostgreSQL databases | Docker volumes `*_postgres_data` | `pg_dump` + cron |
| MongoDB | `127.0.0.1:27017` | `mongodump` + cron |
| Uploaded files | `/var/www/*/uploads`, `/opt/*/uploads` | rsync to remote |
| `.env` files | See Section 9 | Secure offsite copy |
| nginx configs | `/etc/nginx/` | git or rsync |
| This SOP | `/root/VPS-SOP.md` | git or remote copy |

### Backup a PostgreSQL Docker volume

```bash
# Dump from running container
docker exec PROJECTNAME-postgres pg_dump -U USERNAME DBNAME \
  | gzip > /root/backups/DBNAME_$(date +%Y%m%d).sql.gz
```

### Restore a PostgreSQL Docker volume

```bash
# Stop the app container first
docker compose stop api
# Restore into the running postgres container
gunzip -c /root/backups/DBNAME_20260101.sql.gz \
  | docker exec -i PROJECTNAME-postgres psql -U USERNAME DBNAME
# Restart
docker compose up -d api
```

### Recreating a project from scratch

1. Re-pull the Docker image: `docker pull IMAGE:VERSION`
2. Re-create the `.env` from your secure backup
3. Restore the database volume (above)
4. Restore uploaded files from remote backup
5. `systemctl start PROJECTNAME`
6. `nginx -t && systemctl reload nginx`

---

## 16. Hard Rules — Never Do These

These are direct lessons from incidents on this server.

**1. Never bind application ports to `0.0.0.0`**  
The Yadex API was exposed on `0.0.0.0:8000`, bypassing nginx auth entirely. Always use `127.0.0.1:PORT:PORT`.

**2. Never run app processes as root**  
Root PM2 was managing projects directly. Root-level process = instant full server compromise if the app has any RCE vulnerability. Always use a dedicated user.

**3. Never rely on a Docker bind mount to serve files that only exist inside the image**  
The Gandom AI uploads were baked into the image. When the bind mount (empty host dir) was added, it shadowed the image files. All 404. Always seed the host directory before the app container starts (use an init service).

**4. Never remove a container without confirming its writable layer is not the only copy of important data**  
Check `docker inspect CONTAINER --format '{{json .Mounts}}'` before `docker rm`. If you see data not in a named volume or bind mount, extract it first.

**5. Never `chmod 777` a directory**  
This makes files world-writable. Use the minimum required: `755` for directories, `644` for files, `600` for secrets.

**6. Never edit `/etc/nginx/sites-enabled/` files directly**  
The canonical location is `sites-available/`. Edit there, symlink to `sites-enabled/`. Files directly in `sites-enabled/` (like the current `aura-connect.cloud`) will not be updated when you edit `sites-available/`.

**7. Never skip `nginx -t` before reloading**  
A bad nginx config on reload fails silently and leaves the old config running — but a bad config on restart drops all traffic. Always: `nginx -t && systemctl reload nginx`.

**8. Never let PM2 logs grow unbounded**  
The AuraConnect error log reached 2.4 GB. `pm2-logrotate` is configured at 10 MB. If you add a new PM2 app, verify logrotate is picking it up within 30 seconds.

**9. Never hardcode secrets in docker-compose.yml**  
Yadex had `JWT_SECRET_KEY` and `ADMIN_API_KEY` hardcoded. Secrets in compose files end up in git history. Use `${VAR}` with an `.env` file.

**10. Never ignore silent failures in application startup**  
The Kafka/event bus silently dropped all telemetry on every boot with no alert. If a service fails to connect at startup, it must either crash loudly or retry and emit a clear error. Silent failures are worse than loud crashes.

---

## 17. Incident Response Checklist

When something is broken, work through this in order.

```
1. Is nginx running?
   systemctl is-active nginx
   → If not: systemctl start nginx

2. Is the app container/process running?
   docker ps | grep PROJECTNAME
   systemctl is-active PROJECTNAME
   → If not: systemctl start PROJECTNAME; check logs

3. Check app logs for errors
   docker logs PROJECTNAME-CONTAINER --tail 50
   su - PROJECTNAME -c "pm2 logs --lines 50"

4. Check nginx error log
   tail -50 /var/log/nginx/PROJECTNAME-error.log

5. Is the app port listening?
   ss -tlnp | grep PORT
   curl -s http://127.0.0.1:PORT/health

6. Is disk full?
   df -h /
   → If >90%: du -sh /var/log /var/lib/docker /opt /var/www | sort -rh

7. Is RAM full?
   free -h
   → If swap in use: identify culprit with: ps aux --sort=-%mem | head -10

8. Is load average high?
   uptime
   → Identify CPU hogs: ps aux --sort=-%cpu | head -10

9. Certificate issue?
   certbot certificates
   curl -vI https://DOMAIN 2>&1 | grep "expire\|issuer\|SSL"

10. Reload/restart order (safest sequence):
    systemctl reload nginx          # config changes
    systemctl restart PROJECTNAME   # app crash or env change
    systemctl restart nginx         # only if reload fails
```

---

*This document lives at `/root/VPS-SOP.md`. Update it every time you add a project, change a port, or learn a new lesson from an incident.*
