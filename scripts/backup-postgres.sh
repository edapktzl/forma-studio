#!/usr/bin/env bash
set -euo pipefail
umask 077

cd /opt/forma-studio
backup_dir=/opt/backups
mkdir -p "$backup_dir"
exec 9>"$backup_dir/.postgres-backup.lock"
if ! flock -n 9; then
  echo 'Another database backup is running.' >&2
  exit 1
fi

# Use the environment inside the running PostgreSQL container. The root .env
# belongs to Compose and must not be sourced as executable shell code.
timestamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
temporary="$(mktemp "$backup_dir/forma-${timestamp}-XXXXXX.sql.gz.part")"
trap 'rm -f -- "$temporary"' EXIT
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "$temporary"
gzip -t "$temporary"
file="${temporary%.part}"
mv -- "$temporary" "$file"

# Prune completed backups only after a new dump has succeeded.
find "$backup_dir" -maxdepth 1 -type f -name 'forma-*.sql.gz' -mtime +14 -delete
echo "Backup written to $file"
