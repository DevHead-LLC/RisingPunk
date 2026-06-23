#!/usr/bin/env bash
# MongoDB export helper — reads URIs from environment, writes to RisingPunk-Backups.
#
# Usage:
#   export MONGODB_URI_PROD='mongodb+srv://...'
#   export MONGODB_URI_STAGING='mongodb+srv://...'
#   ./export-mongodb.sh prod
#   ./export-mongodb.sh staging
#   ./export-mongodb.sh both
#
# Do NOT commit connection strings. Encrypt output in mongodb/raw/ when done.

set -euo pipefail

BACKUP_ROOT="/Users/robertthiel/RisingPunk-Backups/mongodb/raw"
STAMP="$(date +%Y%m%d-%H%M%S)"

require_mongodump() {
  if ! command -v mongodump >/dev/null 2>&1; then
    echo "error: mongodump not found. Install MongoDB Database Tools." >&2
    exit 1
  fi
}

dump_prod() {
  : "${MONGODB_URI_PROD:?Set MONGODB_URI_PROD}"
  local out="$BACKUP_ROOT/RisingPunkProd-$STAMP"
  mkdir -p "$out"
  echo "Dumping RisingPunkProd -> $out"
  mongodump --uri="$MONGODB_URI_PROD" --db=RisingPunkProd --out="$out"
}

dump_staging() {
  : "${MONGODB_URI_STAGING:?Set MONGODB_URI_STAGING}"
  local out="$BACKUP_ROOT/RisingPunk-$STAMP"
  mkdir -p "$out"
  echo "Dumping RisingPunk (staging) -> $out"
  mongodump --uri="$MONGODB_URI_STAGING" --db=RisingPunk --out="$out"
}

require_mongodump
mkdir -p "$BACKUP_ROOT"

case "${1:-}" in
  prod) dump_prod ;;
  staging) dump_staging ;;
  both) dump_prod; dump_staging ;;
  *)
    echo "Usage: $0 {prod|staging|both}" >&2
    exit 1
    ;;
esac

echo ""
echo "Done. Encrypt before long-term storage:"
echo "  cd $BACKUP_ROOT && zip -er backup-encrypted.zip <folder-name>"
