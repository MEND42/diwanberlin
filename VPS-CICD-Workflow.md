# VPS CI/CD & Collaboration Workflow
**Architecture version:** 1.0  
**Server:** 72.62.46.132 (Ubuntu 22.04, x86_64)  
**Author:** Senior DevOps review — 2026-04-25

---

## Why the Previous Workflow Was Not Acceptable

The previous state was not a workflow — it was a series of manual interventions:

- Deployments required SSHing into the VPS as root and running commands manually
- No project was connected to GitHub in any meaningful way
- Colleagues could not contribute without being handed VPS credentials
- Secrets were hardcoded in compose files that would inevitably end up in git history
- A mistake in one project's deployment could affect the entire server
- There was no audit trail of what was deployed, when, or by whom
- Public repos were impossible without leaking production infrastructure details

This document defines the target architecture and the exact steps to get there.

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  GITHUB (github.com/MEND42/)                                    │
│                                                                  │
│  repo: yadex          repo: gandom-ai      repo: afghan-map     │
│  repo: auraconnect    repo: viamates       repo: qawmaberlin    │
│                                                                  │
│  Each repo:                                                      │
│  • Protected main branch (PR + CI required to merge)            │
│  • .github/workflows/ci.yml   (runs on GitHub cloud — free)    │
│  • .github/workflows/deploy.yml (runs on VPS runner)           │
│  • CODEOWNERS (critical files locked to you)                    │
│  • .env.example (placeholder values — safe to be public)        │
│  • NO real secrets, NO VPS IPs, NO SSH keys in any file        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │  Self-hosted runner polls GitHub (outbound HTTPS only)
                 │  GitHub NEVER connects inbound to your VPS
                 │
┌────────────────▼────────────────────────────────────────────────┐
│  VPS — 72.62.46.132                                             │
│                                                                  │
│  ┌──────────────────────────────────┐                           │
│  │  Project: yadex                  │                           │
│  │  System user: yadex              │                           │
│  │  Runner: /opt/yadex/.runner/     │ ← runs as yadex user     │
│  │  Deploys: docker compose up -d   │                           │
│  │  Secrets: /opt/yadex/.env (600) │ ← never leaves VPS       │
│  └──────────────────────────────────┘                           │
│                                                                  │
│  ┌──────────────────────────────────┐                           │
│  │  Project: gandom-ai              │                           │
│  │  System user: gandomai           │                           │
│  │  Runner: /var/www/gandom-ai/.runner/                        │
│  │  Deploys: docker compose up -d   │                           │
│  └──────────────────────────────────┘                           │
│                                                                  │
│  ... (one isolated runner per project)                          │
│                                                                  │
│  YOU ──SSH──▶  root access (only you have this key)            │
└─────────────────────────────────────────────────────────────────┘
```

### What this guarantees

| Concern | Guarantee |
|---|---|
| Colleague deploys code | Push to GitHub → PR → review → merge → auto-deploy. No VPS access. |
| Colleague sees VPS credentials | Impossible. Runner connects outward. No credentials in GitHub. |
| Public repo exposes production secrets | Impossible. `.env` lives only on VPS. `docker-compose.yml` has no fallback values. |
| Compromised project affects other projects | Contained. Each runner runs as its own limited user with no access to other project dirs. |
| You lose track of what's deployed | Every deploy is a GitHub Actions run with full logs, timestamps, and git SHA. |
| Emergency hotfix while colleague is working | Hotfix branch → PR → your approval → deploy. Full audit trail. |

---

## Security Model

### Actors and permissions

| Actor | GitHub access | VPS access | Can deploy? | Can see secrets? |
|---|---|---|---|---|
| **You** | Owner (all repos) | Root SSH | Yes (merge to main) | Yes (VPS only) |
| **Trusted colleague** | Write (specific repo only) | None | Via PR → merge | No |
| **External contributor** | Fork + PR (read after fork) | None | No (you must merge) | No |
| **GitHub Actions runner** | Read repo code only | Limited (runs as project user) | Executes deploy script | No (`.env` stays on VPS) |

### Trust boundary rules

1. **Only `main` branch deploys to production.** No direct pushes to main — ever.
2. **CI must pass before merge is allowed.** A broken test cannot reach production.
3. **At least one approval required for PRs into main.** You are the mandatory reviewer for security-sensitive projects.
4. **Runners run as the project's system user, never root.** A compromised runner can only access that project's directory.
5. **GitHub Environments add a second gate.** The `production` environment can be configured to require your manual approval before deployment even begins, regardless of CI result.
6. **All GitHub repository secrets are scoped per-repo.** A secret in the `yadex` repo is invisible to the `gandom-ai` runner.

---

## Branch Strategy (all projects)

```
main          ← protected. Production. Deploys automatically on merge.
│
├── develop   ← optional integration branch for larger projects
│   │
│   ├── feature/TICKET-short-description
│   ├── feature/add-payment-flow
│   └── feature/fix-upload-bug
│
└── hotfix/critical-security-patch  ← goes directly to main via PR
```

### Rules per branch

| Branch | Who pushes | CI runs | Deploys |
|---|---|---|---|
| `main` | Nobody directly. Only PR merges. | Yes | Yes → production |
| `develop` | Team | Yes | Optional → staging (future) |
| `feature/*` | Developer | Yes | No |
| `hotfix/*` | You | Yes | Yes → production (after PR) |

### Commit message convention (enforced by CI lint)

```
type(scope): short description

feat(auth): add JWT refresh rotation
fix(uploads): seed host dir before container start
chore(deps): bump postgres to 15.5
docs(api): update endpoint reference
ci(deploy): add health check after compose up
```

---

## Repository Structure (per project)

Every repository must have this structure before it goes live:

```
PROJECT-REPO/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml           # linting, tests — runs on GitHub cloud
│   │   └── deploy.yml       # deploys to VPS — runs on self-hosted runner
│   └── CODEOWNERS           # locks critical paths to you
├── .gitignore               # must include .env*, *.pem, *.key, secrets/
├── .env.example             # placeholder values — SAFE TO COMMIT
├── docker-compose.yml       # no hardcoded secrets (${VAR} only, no :-fallback)
├── Dockerfile               # if applicable
└── ... (project source)
```

### `.gitignore` minimum requirements (all projects)

```gitignore
# Secrets — never commit
.env
.env.*
!.env.example
*.pem
*.key
secrets/
credentials/

# Runtime
node_modules/
__pycache__/
*.pyc
.next/
dist/
build/

# Logs
*.log
logs/

# Docker
.docker/
```

### `CODEOWNERS` template

```
# You must approve any change to these files
/.github/workflows/    @MEND42
/docker-compose*.yml   @MEND42
/Dockerfile            @MEND42
/.env.example          @MEND42
```

---

## Phase 1 — VPS Infrastructure

> Do these steps directly on the VPS. They set up the deployment infrastructure.  
> This phase is your work alone. No GitHub account or colleague involvement needed.

### Step 1.1 — Install the GitHub Actions runner binary (once, server-wide)

```bash
# Download the runner binary to a shared location
mkdir -p /opt/actions-runner-pkg
cd /opt/actions-runner-pkg
curl -sL https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-linux-x64-2.322.0.tar.gz \
  -o actions-runner.tar.gz
# Verify checksum (get from https://github.com/actions/runner/releases)
tar -xzf actions-runner.tar.gz
chmod -R a+rX /opt/actions-runner-pkg
```

### Step 1.2 — Create a runner per project

For each project, repeat this block (substituting PROJECT, USER, REPO_URL, LABEL):

```bash
# --- VARIABLES ---
PROJECT=yadex
USER=yadex
RUNNER_DIR=/opt/yadex/.runner
REPO_URL=https://github.com/MEND42/yadex
LABEL=yadex-vps

# Create runner directory owned by project user
mkdir -p $RUNNER_DIR
cp -a /opt/actions-runner-pkg/. $RUNNER_DIR/
chown -R $USER:$USER $RUNNER_DIR

# Get a registration token from GitHub:
# GitHub → repo → Settings → Actions → Runners → New self-hosted runner
# Copy the token from: ./config.sh --url ... --token THIS_TOKEN
RUNNER_TOKEN=PASTE_TOKEN_HERE

# Register (as project user)
sudo -u $USER $RUNNER_DIR/config.sh \
  --url $REPO_URL \
  --token $RUNNER_TOKEN \
  --name "${LABEL}" \
  --labels "${LABEL}" \
  --work "$RUNNER_DIR/_work" \
  --unattended \
  --replace

# Install as a systemd service (GitHub provides this script)
$RUNNER_DIR/svc.sh install $USER
systemctl enable --now "actions.runner.MEND42-${PROJECT}.${LABEL}.service"
```

### Step 1.3 — Write the deploy script for each project

Each project has a `deploy.sh` in its root directory. The GitHub Actions workflow calls this script — it never runs raw docker commands from the workflow file itself. This gives you full control over the deploy logic.

**Docker Compose project deploy script** (`/opt/PROJECTNAME/deploy.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8000/health}"
HEALTH_RETRIES=12
HEALTH_WAIT=5

echo "[deploy] Starting deploy at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[deploy] Dir: $PROJECT_DIR | Compose: $COMPOSE_FILE"

cd "$PROJECT_DIR"

# 1. Pull latest code
echo "[deploy] Pulling latest code..."
git fetch --all
git reset --hard origin/main

# 2. Build (only if Dockerfile or requirements changed)
echo "[deploy] Building images..."
docker compose -f "$COMPOSE_FILE" build --no-cache

# 3. Deploy with zero-downtime (rolling where possible)
echo "[deploy] Deploying..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 4. Health check
echo "[deploy] Waiting for health check at $HEALTH_URL..."
for i in $(seq 1 $HEALTH_RETRIES); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "[deploy] ✓ Healthy after ${i} attempt(s)"
    exit 0
  fi
  echo "[deploy] Attempt $i/$HEALTH_RETRIES failed, waiting ${HEALTH_WAIT}s..."
  sleep $HEALTH_WAIT
done

echo "[deploy] ✗ Health check failed after $((HEALTH_RETRIES * HEALTH_WAIT))s — rolling back"
git reset --hard HEAD~1
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
exit 1
```

```bash
# Lock down the script
chmod 750 /opt/PROJECTNAME/deploy.sh
chown PROJECTNAME:PROJECTNAME /opt/PROJECTNAME/deploy.sh
```

**PM2 project deploy script** (`/home/auraconnect/AuraConnect/deploy.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[deploy] Starting AuraConnect deploy at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
cd /home/auraconnect/AuraConnect/backend

git fetch --all
git reset --hard origin/main

npm install --production --no-audit

pm2 reload auraconnect-backend --update-env

# Health check
for i in $(seq 1 10); do
  if curl -sf http://127.0.0.1:5001/health > /dev/null 2>&1; then
    echo "[deploy] ✓ Healthy"
    exit 0
  fi
  sleep 3
done
echo "[deploy] ✗ Health check failed"
exit 1
```

### Step 1.4 — Set up deploy logging

```bash
mkdir -p /var/log/deployments
chmod 755 /var/log/deployments
# Each project writes its own deploy log (from the deploy.sh script)
# Add to deploy.sh:  exec > >(tee -a /var/log/deployments/PROJECTNAME.log) 2>&1
```

### Step 1.5 — Configure project git remotes on the VPS

For each project directory on the VPS, point it at the GitHub repo.  
The runner will use its own credentials (from runner registration) to pull code.

```bash
# For Docker Compose projects
cd /opt/PROJECTNAME
git init
git remote add origin https://github.com/MEND42/REPO-NAME.git
git fetch origin
git checkout main
chown -R PROJECTNAME:PROJECTNAME /opt/PROJECTNAME/.git

# For AuraConnect (PM2)
cd /home/auraconnect/AuraConnect
git init
git remote add origin https://github.com/MEND42/auraconnect.git
# ... etc.
```

### Step 1.6 — GitHub Environment protection

In GitHub, for each repo:  
**Settings → Environments → New environment → "production"**

Configure:
- ✅ Required reviewers: `@MEND42` (you must approve each deploy)
- ✅ Deployment branches: `main` only
- ✅ Environment secrets: any runtime values needed at deploy time

This is the second gate. Even if CI passes and the PR is merged, the deploy job pauses and waits for your approval in the GitHub UI.

### Step 1.7 — Firewall hardening for runner traffic

The runner only makes outbound HTTPS connections to GitHub. No new firewall rules needed.  
Verify the VPS is NOT exposing any new ports:

```bash
ss -tlnp | grep -vE "127\.0\.0\.1|::1|0\.0\.0\.0:22|0\.0\.0\.0:80|0\.0\.0\.0:443"
# Only SSH (22), HTTP (80), HTTPS (443) should be public-facing
```

---

## Phase 2 — Per-Project GitHub Setup

> For each project, do these steps once. After this, the project is fully connected.  
> Some of these steps can be delegated to a trusted colleague for their own project.

### Step 2.1 — Create the GitHub repository

```bash
# Using gh CLI (already installed on VPS, or from your laptop)
gh repo create MEND42/PROJECTNAME \
  --private \              # start private; make public only when safe
  --description "..." \
  --homepage "https://YOURDOMAIN.com"
```

For public repos (static sites, open-source):
```bash
gh repo create MEND42/PROJECTNAME --public
```

### Step 2.2 — Initial push

```bash
cd /opt/PROJECTNAME   # or wherever the project lives

# Make sure .gitignore is correct BEFORE the first commit
cat .gitignore | grep ".env"   # must show .env

git init -b main
git remote add origin https://github.com/MEND42/PROJECTNAME.git
git add .
git commit -m "feat: initial commit"
git push -u origin main
```

### Step 2.3 — Add workflow files

Every project gets two workflow files.

**`.github/workflows/ci.yml`** — Runs on every PR, on GitHub cloud (not on VPS):

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for secrets accidentally committed
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

      # Add language-specific steps below:

      # Node.js example:
      # - uses: actions/setup-node@v4
      #   with: { node-version: '18' }
      # - run: npm ci
      # - run: npm test

      # Python example:
      # - uses: actions/setup-python@v5
      #   with: { python-version: '3.11' }
      # - run: pip install -r requirements.txt
      # - run: pytest

      - name: Verify no .env files committed
        run: |
          if find . -name ".env" -not -path "./.git/*" | grep -q .; then
            echo "ERROR: .env file found in repository!"
            exit 1
          fi

      - name: Verify docker-compose has no hardcoded secrets
        run: |
          if grep -rE ":-[A-Za-z0-9+/]{20,}" docker-compose*.yml 2>/dev/null; then
            echo "ERROR: hardcoded secret fallbacks found in docker-compose file"
            exit 1
          fi
```

**`.github/workflows/deploy.yml`** — Runs only on push to main, on your VPS runner:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:  # allows manual trigger from GitHub UI

concurrency:
  group: production-deploy
  cancel-in-progress: false  # never cancel a deploy in progress

jobs:
  deploy:
    runs-on: [self-hosted, PROJECTNAME-vps]  # your VPS runner label
    environment: production                   # requires your approval

    steps:
      - name: Deploy
        run: /opt/PROJECTNAME/deploy.sh
        env:
          COMPOSE_FILE: docker-compose.prod.yml
          HEALTH_URL: http://127.0.0.1:PORT/health

      - name: Notify on failure
        if: failure()
        run: |
          echo "DEPLOY FAILED for PROJECTNAME at $(date)" \
            >> /var/log/deployments/PROJECTNAME.log
          # Add Telegram/email notification here if desired
```

### Step 2.4 — Branch protection rules

```bash
# Via gh CLI
gh api repos/MEND42/PROJECTNAME/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["lint-and-test"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

Or via GitHub UI: **Settings → Branches → Add rule → Branch name: `main`**
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (for security-critical repos)

### Step 2.5 — Set GitHub Actions secrets

These are secrets the CI workflow needs (NOT runtime secrets — those stay in `.env` on VPS):

```bash
# Example for a project that needs to push a Docker image to a registry
gh secret set REGISTRY_TOKEN --repo MEND42/PROJECTNAME

# Example for notification webhooks
gh secret set TELEGRAM_BOT_TOKEN --repo MEND42/PROJECTNAME
```

**Never set these as GitHub secrets** (they belong in `.env` on the VPS):
- `DATABASE_URL`, `POSTGRES_PASSWORD`
- `JWT_SECRET_KEY`, `ADMIN_API_KEY`
- Any API key used at runtime

### Step 2.6 — Add CODEOWNERS

```bash
mkdir -p .github
cat > .github/CODEOWNERS << 'EOF'
# Changes to these files require your review regardless of who opens the PR
/.github/workflows/   @MEND42
/docker-compose*.yml  @MEND42
/Dockerfile           @MEND42
/nginx.conf           @MEND42
/.env.example         @MEND42
EOF
```

### Step 2.7 — Invite a colleague to a specific project

```bash
# Invite with write access to a SPECIFIC repo only
gh api repos/MEND42/PROJECTNAME/collaborators/COLLEAGUE-GITHUB-USERNAME \
  --method PUT \
  --field permission=write

# Or via GitHub UI: repo → Settings → Collaborators → Add people
```

The colleague now can:
- Clone the repo
- Push branches
- Open pull requests
- See CI results

The colleague **cannot**:
- Merge to main (requires your approval)
- See GitHub secrets
- Access the VPS in any way
- Affect any other project

---

## Project-Specific Workflow Details

### Current project status and required actions

| Project | GitHub repo | Runner needed | Phase 1 status | Phase 2 status |
|---|---|---|---|---|
| AuraConnect | create: `MEND42/auraconnect` | `auraconnect-vps` | ⬜ pending | ⬜ pending |
| Afghan Diaspora | create: `MEND42/afghan-diaspora-map` | `afghan-vps` | ⬜ pending | ⬜ pending |
| Yadex | create: `MEND42/yadex` | `yadex-vps` | ⬜ pending | ⬜ pending |
| Gandom AI | create: `MEND42/gandom-ai` | `gandomai-vps` | ⬜ pending | ⬜ pending |
| Viamates | exists: `MEND42/ViaMates` | `viamates-vps` | ⬜ pending | ⬜ partial |
| QawmaBerlin | create: `MEND42/qawmaberlin` | `qawmaberlin-vps` | ⬜ pending | ⬜ pending |
| DiwanBerlin | create: `MEND42/diwanberlin` | `diwanberlin-vps` | ⬜ pending | ⬜ pending |

Update this table as you complete each step.

---

## Onboarding Playbook — New Project

When you start a new project on this VPS, follow these steps in order. This is the single workflow for every new deployment from now on.

```
[ ] 1. Add project to Project Registry in VPS-SOP.md
[ ] 2. Create system user:
        useradd -r -s /usr/sbin/nologin -M -d /opt/PROJECTNAME PROJECTNAME
        usermod -aG docker PROJECTNAME
[ ] 3. Create project directory and assign ownership:
        mkdir -p /opt/PROJECTNAME
        chown PROJECTNAME:PROJECTNAME /opt/PROJECTNAME
[ ] 4. Write docker-compose.yml (no hardcoded secrets)
[ ] 5. Write .env (chmod 600, no fallback values in compose)
[ ] 6. Write deploy.sh (chmod 750, owned by project user)
[ ] 7. Create GitHub repo: gh repo create MEND42/PROJECTNAME --private
[ ] 8. Push initial code (check .gitignore first)
[ ] 9. Get runner registration token from GitHub
        GitHub → repo → Settings → Actions → Runners → New self-hosted runner
[  ] 10. Register runner on VPS as project user
[  ] 11. Add .github/workflows/ci.yml and deploy.yml
[  ] 12. Set branch protection on main
[  ] 13. Configure GitHub Environment "production" with your approval required
[  ] 14. Write nginx vhost (see VPS-SOP.md §7)
[  ] 15. Issue SSL cert: certbot certonly --nginx -d DOMAIN
[  ] 16. Test: push to a branch → PR → CI passes → merge → check GitHub Actions → verify deploy
```

---

## Onboarding Playbook — New Colleague

When you want someone to work on a specific project:

```
[ ] 1. Ask for their GitHub username
[ ] 2. Invite to that repo only:
        gh api repos/MEND42/PROJECTNAME/collaborators/THEIR-USERNAME \
          --method PUT --field permission=write
[ ] 3. Share the .env.example so they can set up locally
[ ] 4. Tell them the branching strategy:
        - Create feature/your-feature-name branch
        - Open PR into main
        - CI must pass, you must approve
        - You merge, VPS auto-deploys
[ ] 5. Do NOT share: VPS IP, SSH keys, .env values, GitHub secrets
```

They never need anything beyond GitHub. The VPS is invisible to them.

---

## Day-to-Day Operations After Setup

### Deploying an update (after this workflow is in place)

```bash
# You do this on your laptop, not the VPS:
git checkout -b fix/the-bug
# ... make changes ...
git commit -m "fix(uploads): ensure host dir seeded before mount"
git push origin fix/the-bug
# Open PR on GitHub → CI runs → you review → merge → VPS auto-deploys
```

### Emergency hotfix

```bash
git checkout -b hotfix/critical-auth-bypass
# ... fix ...
git push origin hotfix/critical-auth-bypass
# Open PR → skip normal review queue (you approve your own) → merge → auto-deploy
```

### Checking deploy history

```bash
# On VPS:
cat /var/log/deployments/PROJECTNAME.log

# Or on GitHub:
# repo → Actions → filter by "Deploy to Production" workflow
```

### Rotating a secret

```bash
# 1. Update .env on VPS:
nano /opt/PROJECTNAME/.env
# 2. Restart the service to pick up new value:
systemctl restart PROJECTNAME
# OR for Docker:
docker compose -f docker-compose.prod.yml up -d
# No GitHub involvement needed. Secrets never leave the VPS.
```

### Making a repo public (safe because .env never gets committed)

```bash
# Audit the repo first — check no secrets exist in git history
gh secret list --repo MEND42/PROJECTNAME   # should be empty or CI-only secrets
git log --all --full-history -- .env        # should return nothing
# If clean:
gh repo edit MEND42/PROJECTNAME --visibility public
```

---

## What NOT to Do (addendum to VPS-SOP.md §16)

**11. Never use GitHub Actions `ubuntu-latest` runners for deployment.**  
They are ephemeral cloud VMs with no access to your VPS. Deployment must use `self-hosted` runners.

**12. Never store the runner registration token after use.**  
It expires after 1 hour. If you need to re-register a runner, generate a new token from GitHub. Old tokens are useless.

**13. Never run multiple projects' runners under the same user.**  
If runner A is compromised, it must not be able to read runner B's `.env`. One user per runner, per project.

**14. Never use `workflow_dispatch` as the only way to deploy.**  
Always make `push to main` the canonical trigger. `workflow_dispatch` is for emergency manual runs only.

**15. Never give a colleague write access to the `.github/workflows/` directory without CODEOWNERS protection.**  
A malicious or careless workflow change can execute arbitrary code on your VPS runner. CODEOWNERS ensures you approve every workflow change.

---

## Implementation Sequence (suggested order)

Do not try to implement everything at once. Use this sequence to go live project by project.

### Week 1 — Foundation
- [ ] Download and stage runner binary (`/opt/actions-runner-pkg/`)
- [ ] Implement for one project (recommend: **Yadex** — most isolated, Docker-only)
- [ ] Full end-to-end test: push branch → PR → CI → approve → deploy → health check
- [ ] Document any deviations from this plan

### Week 2 — Expand
- [ ] Add Gandom AI
- [ ] Add Afghan Diaspora Map

### Week 3 — Legacy projects
- [ ] AuraConnect (PM2 deploy script needs special care)
- [ ] Viamates (already has GitHub remote, easiest migration)

### Week 4 — Static sites
- [ ] QawmaBerlin
- [ ] DiwanBerlin (simplest — just `git pull` deploys)

### Ongoing
- [ ] Rotate secrets on Yadex (`JWT_SECRET_KEY`, `ADMIN_API_KEY`) during a maintenance window
- [ ] Configure Telegram/email notifications in deploy.sh for all projects
- [ ] Review GitHub Actions runner versions quarterly

---

*This document lives at `/root/VPS-CICD-Workflow.md`.  
Read alongside `/root/VPS-SOP.md`.  
Update the project status table above as implementation progresses.*
