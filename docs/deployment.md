# OCI production deployment

The production stack runs on the Ubuntu 22.04 OCI VM at `/opt/forma-studio`. The VM runs Docker Compose and Caddy; GitHub Actions builds and publishes the images to GHCR. Do not run the Next.js builds on the 1 GB VM.

## One-time server setup

SSH to the VM and run the preparation script from a trusted checkout, or execute its commands manually:

```bash
sudo apt update && sudo apt upgrade -y
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo install -d -m 0750 -o "$USER" -g "$USER" /opt/forma-studio /opt/backups
```

Log in again after adding the user to the Docker group. Open TCP 22 only from your own fixed IP and TCP 80/443 from the internet in OCI. In UFW, allow the same ports and deny all other incoming traffic. Never publish 3000, 3001, 8000 or 5432.

Copy these files to `/opt/forma-studio`:

```text
infra/docker-compose.yml       → docker-compose.yml
infra/docker-compose.prod.yml  → docker-compose.prod.yml
infra/Caddyfile                → Caddyfile
```

Create `/opt/forma-studio/.env` with the production values from `.env.example`. Keep `POSTGRES_PASSWORD`, `JWT_SECRET`, `RESEND_API_KEY` and the notification address private.

## DNS and first start

Create A records in Cloudflare for `www`, `admin` and `api` pointing to the VM public IP. Set Cloudflare SSL/TLS to `Full (strict)`. After DNS resolves, start the stack:

```bash
cd /opt/forma-studio
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml ps
curl --fail https://api.edanurpektezel.com/api/v1/health
```

Caddy obtains and renews the Let’s Encrypt certificates automatically. Its `/data` and `/config` volumes must not be removed.

## GitHub Actions

Add these repository secrets:

```text
VPS_HOST=130.61.161.165
VPS_USER=ubuntu
VPS_SSH_KEY=<dedicated deploy private key>
```

The deploy public key belongs in the VM user’s `~/.ssh/authorized_keys`. Enable Actions write permission for packages and make the three GHCR packages public if the VPS will pull without registry credentials. A push to `main` runs tests, builds all three images, tags them with `main-<commit-sha>`, copies the Compose files, pulls the immutable tag and restarts the services.

## Backups and rollback

Run `scripts/backup-postgres.sh` daily from cron. Copy `/opt/backups` to OCI Object Storage or another host; a backup stored only on the VM is not sufficient. To roll back, set `IMAGE_TAG` to a previous `main-<commit-sha>` and run `docker compose pull` followed by `docker compose up -d`. Take a database backup before any destructive migration.
