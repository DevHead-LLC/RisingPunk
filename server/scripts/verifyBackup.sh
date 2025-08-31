#!/bin/bash

# Backup Verification Script
# Tests backup integrity and restore functionality

set -e

# Configuration
BACKUP_DIR="./backups"
TEST_RESTORE_DIR="./test-restore"

echo "🔍 Starting backup verification process..."

# Check if backup directory exists and has files
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# List available backups
echo "📁 Available backups:"
ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || {
    echo "   No backup files found"
    exit 1
}

# Get the most recent backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz | head -1)
echo "🔍 Testing latest backup: $LATEST_BACKUP"

# Verify backup file integrity
echo "✅ Verifying backup file integrity..."
if ! tar -tzf "$LATEST_BACKUP" > /dev/null; then
    echo "❌ Backup file is corrupted or invalid"
    exit 1
fi
echo "   ✅ Backup file integrity verified"

# Test restore to temporary directory
echo "🧪 Testing restore functionality..."
rm -rf "$TEST_RESTORE_DIR"
mkdir -p "$TEST_RESTORE_DIR"

# Extract backup
echo "   📦 Extracting backup..."
tar -xzf "$LATEST_BACKUP" -C "$TEST_RESTORE_DIR"

# Check if restore directory has expected structure
if [ -d "$TEST_RESTORE_DIR/backups"/*/RisingPunk ]; then
    echo "   ✅ Backup structure verified"
    
    # List restored collections
    echo "   📊 Restored collections:"
    ls -la "$TEST_RESTORE_DIR/backups"/*/RisingPunk/ 2>/dev/null || echo "      No collections found"
    
    # Check for specific collections we expect
    if [ -d "$TEST_RESTORE_DIR/backups"/*/RisingPunk/users ]; then
        echo "      ✅ Users collection found"
    fi
    if [ -d "$TEST_RESTORE_DIR/backups"/*/RisingPunk/user_activity_logs ]; then
        echo "      ✅ User activity logs collection found"
    fi
    if [ -d "$TEST_RESTORE_DIR/backups"/*/RisingPunk/battles ]; then
        echo "      ✅ Battles collection found"
    fi
else
    echo "   ❌ Backup structure is unexpected"
    echo "   📁 Found structure:"
    find "$TEST_RESTORE_DIR" -type d | head -10
    exit 1
fi

# Clean up test restore
echo "🧹 Cleaning up test restore..."
rm -rf "$TEST_RESTORE_DIR"

echo "✅ Backup verification completed successfully!"
echo "📊 Backup summary:"
echo "   - File: $LATEST_BACKUP"
echo "   - Size: $(du -h "$LATEST_BACKUP" | cut -f1)"
echo "   - Created: $(stat -c %y "$LATEST_BACKUP" 2>/dev/null || stat -f %Sm "$LATEST_BACKUP" 2>/dev/null || echo 'Unknown')"
echo "   - Integrity: ✅ Verified"
echo "   - Restore: ✅ Tested"
