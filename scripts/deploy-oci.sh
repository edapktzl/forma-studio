#!/usr/bin/env bash
# Run on the VPS after copying the deployment files. Never build on the VPS.
set -Eeuo pipefail
umask 077
cd /opt/forma-studio
[[ "${1:-}" =~ ^main-[a-f0-9]{40}$ ]] || { echo 'Expected an immutable main-<commit-sha> image tag.' >&2; exit 1; }
test -f .env
chmod 600 .env
exec 9>.deploy.lock
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
export IMAGE_TAG="$1"
compose=(docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml)
trap '"${compose[@]}" ps; "${compose[@]}" logs --tail=60 api caddy || true' ERR
"${compose[@]}" config --quiet
"${compose[@]}" pull

# Keep a database snapshot before running forward-only schema migrations.
if [[ -n "$("${compose[@]}" ps --status running -q postgres)" ]]; then
  bash /opt/forma-studio/backup-postgres.sh
fi
previous=$(sed -n 's/^IMAGE_TAG=//p' .env | tail -n 1)
if [[ -z "$previous" ]]; then
  web_id=$("${compose[@]}" ps -q web)
  if [[ -n "$web_id" ]]; then
    previous=$(docker inspect --format '{{.Config.Image}}' "$web_id")
    previous=${previous##*:}
  fi
fi
"${compose[@]}" up -d --remove-orphans
# Caddy's config is a bind mount; replace the container to read the copied file.
"${compose[@]}" up -d --force-recreate --no-deps caddy
curl --fail --silent --show-error --retry 12 --retry-all-errors --retry-delay 5 --retry-max-time 90 --max-time 15 http://127.0.0.1:8000/api/v1/health
for url in https://www.edanurpektezel.com/ https://forma-studio.edanurpektezel.com/ https://admin.edanurpektezel.com/login/ https://api.edanurpektezel.com/api/v1/health; do
  echo "Checking $url"
  curl --fail --silent --show-error --output /dev/null --retry 24 --retry-all-errors --retry-delay 5 --retry-max-time 180 --max-time 15 "$url"
done

# Persist the successful tag so manual restarts never silently switch to latest.
env_tmp=$(mktemp .env.deploy.XXXXXX)
sed '/^IMAGE_TAG=/d' .env > "$env_tmp"
printf '\nIMAGE_TAG=%s\n' "$IMAGE_TAG" >> "$env_tmp"
mv "$env_tmp" .env
if [[ "$previous" =~ ^main-[a-f0-9]{40}$ && "$previous" != "$IMAGE_TAG" ]]; then
  printf '%s\n' "$previous" > .previous-image-tag
fi

# Install one managed daily backup entry while preserving the user's cron jobs.
if command -v crontab >/dev/null 2>&1; then
  cron_tmp=$(mktemp)
  { crontab -l 2>/dev/null || true; } | sed '\|# forma-database-backup$|d' > "$cron_tmp"
  printf '%s\n' '17 3 * * * /bin/bash /opt/forma-studio/backup-postgres.sh >> /opt/forma-studio/backup.log 2>&1 # forma-database-backup' >> "$cron_tmp"
  crontab "$cron_tmp"
  rm -f "$cron_tmp"
else
  echo 'Daily backup schedule is not installed: cron is unavailable. Install cron and rerun deployment.' >&2
fi
"${compose[@]}" ps
# Keep tagged releases for rollback; remove only dangling layers.
docker image prune -f
