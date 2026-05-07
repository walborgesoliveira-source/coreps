#!/bin/bash
# Backup diário do banco CORE PS — cron: 0 2 * * * /root/core-ps/scripts/backup.sh

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$DIR/.env"

DATE=$(date +%Y%m%d_%H%M%S)
FILE="$DIR/backups/coreps_$DATE.sql.gz"

docker exec coreps_db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILE"
echo "[$(date)] Backup criado: $FILE"

# Remover backups com mais de 30 dias
find "$DIR/backups" -name "coreps_*.sql.gz" -mtime +30 -delete

# Enviar para Google Drive (rclone deve estar configurado)
if command -v rclone &>/dev/null; then
  if rclone copy "$FILE" gdrive:backups/coreps/; then
    echo "[$(date)] Upload GDrive OK"
  else
    echo "[$(date)] Upload GDrive falhou; backup local preservado em: $FILE" >&2
  fi
fi
