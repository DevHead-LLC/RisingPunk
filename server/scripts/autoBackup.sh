#!/bin/bash

# Automated MongoDB Atlas Backup Script
# Run this script to automatically backup your RisingPunk database

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/${TIMESTAMP}"
MONGODB_URI="mongodb+srv://robert:Bestinthewest7%26@risingpunkdb.zqzrm.mongodb.net/RisingPunk"

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

# Move to permanent location (create this directory first)
mkdir -p ~/RisingPunk-backups
mv "${BACKUP_DIR}.tar.gz" ~/RisingPunk-backups/

echo "✅ Backup completed successfully!"
echo "📁 Backup saved to: ~/RisingPunk-backups/${TIMESTAMP}.tar.gz"

# Optional: Keep only last 5 backups
cd ~/RisingPunk-backups
ls -t *.tar.gz | tail -n +6 | xargs -r rm

echo "🧹 Cleaned up old backups (kept last 5)"
