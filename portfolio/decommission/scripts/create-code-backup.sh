#!/usr/bin/env bash
# Create a code-only ZIP archive of the RisingPunk repo (no node_modules).
# Output: /Users/robertthiel/RisingPunk-Backups/code/

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKUP_DIR="/Users/robertthiel/RisingPunk-Backups/code"
STAMP="$(date +%Y%m%d-%H%M%S)"
REF="${1:-HEAD}"
OUT="$BACKUP_DIR/RisingPunk-${STAMP}-${REF//\//-}.zip"

mkdir -p "$BACKUP_DIR"

cd "$REPO_ROOT"

if ! git rev-parse --verify "$REF" >/dev/null 2>&1; then
  echo "error: git ref not found: $REF" >&2
  exit 1
fi

echo "Archiving $REF from $REPO_ROOT"
git archive --format=zip --prefix=RisingPunk/ -o "$OUT" "$REF"

SHORT_SHA="$(git rev-parse --short "$REF")"
echo "Created: $OUT"
echo "Commit: $SHORT_SHA ($(git log -1 --format='%s' "$REF"))"
echo ""
echo "Optional: tag this ref before archiving:"
echo "  git tag -a v1.0-final-decommissioned -m 'Final portfolio archive' $REF"
