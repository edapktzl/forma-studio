# OCI production deployment

The production stack runs on the Ubuntu 22.04 OCI VM at `/opt/forma-studio`. The VM runs Docker Compose and Caddy; GitHub Actions builds and publishes the images to GHCR. Do not run the Next.js builds on the 1 GB VM.

## One-time server setup

Run `scripts/prepare-oci.sh` from a trusted checkout as the SSH deploy user. In an SSH session the script uses the current client IP. For a console session, set an explicit IP/CIDR:

```bash
SSH_SOURCE=203.0.113.10/32 bash scripts/prepare-oci.sh
```

Replace the example IP with your address. The script installs Docker from its signed Ubuntu repository, enables it on boot, and creates swap only if absent. Existing swap files and firewall rules are preserved. It refuses to enable UFW without a valid SSH source. Keep your current SSH session open and test a second login. Log in again to activate Docker group membership.

In OCI, allow stateful TCP ingress with **Source Port Range = All** and **Destination Port Range = 80** and **443** from `0.0.0.0/0`. Allow destination port 22 from approved SSH sources. Apply matching OS firewall rules. Standard GitHub-hosted runners have changing IPs: restricting SSH to only your home IP blocks the current deploy workflow. Use a runner with fixed egress or a VPN for a narrow allowlist; otherwise the firewall policy must also allow the deploy runner. Use a dedicated key and disable password SSH authentication. Do not remove working SSH rules blindly.

Only Caddy binds public host ports. Web, admin and API diagnostics bind to `127.0.0.1`; PostgreSQL has no host port. Docker-published ports can bypass UFW, so these loopback bindings and OCI ingress restrictions are intentional.

Copy these files to `/opt/forma-studio`:

```text
infra/docker-compose.yml       → docker-compose.yml
infra/docker-compose.prod.yml  → docker-compose.prod.yml
infra/Caddyfile                → Caddyfile
scripts/backup-postgres.sh     → backup-postgres.sh
```

Create `/opt/forma-studio/.env` with the production values from `.env.example`. Keep `POSTGRES_PASSWORD`, `JWT_SECRET`, `RESEND_API_KEY` and the notification address private.

Set `IMAGE_TAG=main-<full-commit-sha>` in `.env` so later manual restarts use the deployed release. Apply `chmod 600 /opt/forma-studio/.env`. Do not source `.env` as shell code. Use `docker compose ... config --quiet` for validation; ordinary `config` output expands secrets.

## DNS and first start

Create A records in Cloudflare for `www`, `forma-studio`, `admin` and `api` pointing to the VM public IP. Set Cloudflare SSL/TLS to `Full (strict)`. After DNS resolves, start the stack:

```bash
cd /opt/forma-studio
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml ps
curl --fail --retry 8 --retry-connrefused --retry-delay 5 https://api.edanurpektezel.com/api/v1/health
```

Caddy obtains and renews the Let’s Encrypt certificates automatically for all four hostnames. The `forma-studio.edanurpektezel.com` host uses the existing `web:3000` container, so no new application port or container is required. Its `/data` and `/config` volumes must not be removed.

Caddy applies HTTPS/security headers and limits API request bodies to 70 MB. The API accepts images up to 10 MB and MP4 hero videos up to 60 MB. The admin/API `noindex` header discourages indexing; authorization is enforced by the API. A healthy API does not prove login, content editing, contact submissions or e-mail delivery work: test these separately. Without Resend credentials, messages remain saved and notification jobs wait for configuration.

## GitHub Actions

Add these repository secrets:

```text
VPS_HOST=130.61.161.165
VPS_USER=ubuntu
VPS_SSH_KEY=<dedicated deploy private key>
```

The deploy public key belongs in the VM user’s `~/.ssh/authorized_keys`. Enable Actions write permission for packages and make the three GHCR packages public if the VPS will pull without registry credentials. A push to `main` runs tests, builds all three images, tags them with `main-<commit-sha>`, copies the Compose files, pulls the immutable tag and restarts the services.

Only the image-publishing job needs package write permission. A public repository does not automatically make GHCR packages public. The workflow verifies the VPS ED25519 host fingerprint before copying files, serializes production deployments, takes a database backup before migrations, and deploys the immutable `main-<commit-sha>` tag. Update the fingerprint from the trusted OCI console if the server is replaced; never accept a new SSH key blindly. Persisting the deployed image tag in `.env` prevents a manual restart from silently switching to `latest`.

## Backups and rollback

The backup script uses PostgreSQL's container environment, locks out overlapping runs, and atomically publishes private timestamped dumps. A failed dump cannot replace a completed backup. Completed dumps older than 14 days are pruned only after a successful new dump.

Install the copied script and test it:

```bash
chmod 750 /opt/forma-studio/backup-postgres.sh
bash /opt/forma-studio/backup-postgres.sh
```

The deploy script installs one idempotent user crontab entry. If you prefer a root-owned `/etc/cron.d/forma-postgres-backup`, it can contain this schedule (adjust `ubuntu` to the deploy user):

```cron
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 2 * * * ubuntu /bin/bash /opt/forma-studio/backup-postgres.sh >> /opt/backups/backup.log 2>&1
```

Check that dumps appear and periodically restore one to a separate test database. Copy `/opt/backups` to OCI Object Storage or another host; local files alone cannot protect against VM loss. Off-host transfer requires storage credentials and monitoring. Images live in `api_media`; database dumps contain only their metadata. Back up that volume separately, preferably with uploads paused. R2 migration remains a separate task. Never run `docker compose down -v` in production.

Before a schema change, take and verify a database backup. To roll back application images, set `IMAGE_TAG` in the private `.env` to the previous `main-<full-commit-sha>`, then run the full `pull` and `up` commands above with both Compose files. Verify the previous application supports the current schema. `docker compose pull` accepts service names, not image references. Database restores and migration downgrades require a separate maintenance procedure.

## Resource limits

Web/admin use non-root Next.js standalone runtime images. Every production container has log rotation and memory limits. Node heaps and PostgreSQL memory/connection settings are reduced for the small VM. The container ceilings together exceed 1 GB; these are limits, not reserved memory. Low traffic and 2 GB swap remain necessary, and swap is slower than RAM. Monitor `free -h` and `docker stats --no-stream`; increase VM memory if normal traffic causes swapping or out-of-memory restarts. Keep a previous image release for rollback and never prune production volumes.

Reference documentation: [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [Compose service settings](https://docs.docker.com/reference/compose-file/services/), [Caddy request body limits](https://caddyserver.com/docs/caddyfile/directives/request_body).
