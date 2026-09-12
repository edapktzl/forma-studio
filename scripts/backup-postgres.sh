#!/usr/bin/env bash
set -euo pipefail
cd /opt/forma-studio
mkdir -p /opt/backups
file="/opt/backups/forma-$(date -u +%F).sql.gz"
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-forma}" -d "${POSTGRES_DB:-forma}" | gzip > "$file"
find /opt/backups -type f -name 'forma-*.sql.gz' -mtime +14 -delete
echo "Backup written to $file"
