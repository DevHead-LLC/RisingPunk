#!/bin/bash

# Automated MongoDB Atlas Backup Script
# Run this script to automatically backup your RisingPunk database

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/${TIMESTAMP}"
RETENTION_DAYS_APP=5
RETENTION_DAYS_USER_DATA=30

# Load environment variables from env.staging file
if [ -f .env.staging ]; then
    set -a
    source .env.staging
    set +a
fi

# Check if MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "❌ Error: MONGODB_URI environment variable is not set"
    echo "   Please ensure .env.staging contains MONGODB_URI"
    echo "   Example: MONGODB_URI='mongodb+srv://username:password@cluster.mongodb.net/database'"
    exit 1
fi

echo "🚀 Starting automated backup at ${TIMESTAMP}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    echo "❌ mongodump not found. Please install MongoDB Database Tools:"
    echo "   macOS: brew install mongodb/brew/mongodb-database-tools"
    echo "   Ubuntu: sudo apt-get install mongodb-database-tools"
    exit 1
fi

# Perform backup
echo "📦 Backing up database..."
mongodump --uri="${MONGODB_URI}" --out="${BACKUP_DIR}"

# Compress backup
echo "🗜️  Compressing backup..."
tar -czf "${BACKUP_DIR}.tar.gz" "${BACKUP_DIR}"

# Clean up uncompressed backup
rm -rf "${BACKUP_DIR}"

echo "✅ Backup completed successfully!"
echo "📁 Backup saved to: ${BACKUP_DIR}.tar.gz"

# Clean up old backups based on retention policy
echo "🧹 Cleaning up old backups..."

# Keep last 5 application backups (for disaster recovery)
cd ./backups
ls -t *.tar.gz | tail -n +6 | xargs -r rm -f
echo "   ✅ Kept last 5 application backups"

# Keep user data backups for 30 days (for privacy policy compliance)
find . -name "*.tar.gz" -type f -mtime +${RETENTION_DAYS_USER_DATA} -delete
echo "   ✅ Kept user data backups for ${RETENTION_DAYS_USER_DATA} days"

echo "🧹 Backup cleanup completed!"
echo "📊 Current backup files:"
ls -la *.tar.gz 2>/dev/null || echo "   No backup files found"
