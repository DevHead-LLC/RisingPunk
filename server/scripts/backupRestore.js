#!/usr/bin/env node

/**
 * MongoDB Atlas Backup and Restore Script
 * 
 * This script provides commands for backing up and restoring your RisingPunk database.
 * 
 * IMPORTANT: These are manual commands you need to run in your terminal.
 * This script just provides the commands and instructions.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate backup commands for MongoDB Atlas
 */
function generateBackupCommands() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `./backups/${timestamp}`;
  
  console.log('📦 MongoDB Atlas Backup Commands');
  console.log('================================\n');
  
  console.log('1. Create backup directory:');
  console.log(`   mkdir -p ${backupDir}\n`);
  
  console.log('2. Backup entire database (using mongodump):');
  console.log('   # Install MongoDB tools if you haven\'t:');
  console.log('   # macOS: brew install mongodb/brew/mongodb-database-tools');
  console.log('   # Ubuntu: sudo apt-get install mongodb-database-tools');
  console.log('   # Windows: Download from MongoDB website\n');
  
  console.log('   # Backup command:');
  console.log(`   mongodump --uri="${process.env.MONGODB_URI}" --out=${backupDir}\n`);
  
  console.log('3. Alternative: Backup specific collections:');
  console.log('   # Backup only game configuration collections:');
  console.log(`   mongodump --uri="${process.env.MONGODB_URI}" --collection=game_config --collection=bot_types --collection=bot_growth_config --collection=combat_type_advantages --collection=finance_tier_templates --collection=research --collection=maps --out=${backupDir}/config-only\n`);
  
  console.log('4. Compress backup:');
  console.log(`   tar -czf ${backupDir}.tar.gz ${backupDir}\n`);
  
  console.log('5. Clean up uncompressed backup:');
  console.log(`   rm -rf ${backupDir}\n`);
  
  console.log('6. Move to permanent backup location:');
  console.log(`   mv ${backupDir}.tar.gz ~/RisingPunk-backups/\n`);
}

/**
 * Generate restore commands for MongoDB Atlas
 */
function generateRestoreCommands() {
  console.log('\n🔄 MongoDB Atlas Restore Commands');
  console.log('================================\n');
  
  console.log('1. Restore entire database:');
  console.log('   # Extract backup:');
  console.log('   tar -xzf backup-file.tar.gz\n');
  
  console.log('   # Restore command:');
  console.log('   mongorestore --uri="${process.env.MONGODB_URI}" --drop backup-directory/\n');
  
  console.log('2. Restore specific collections:');
  console.log('   # Restore only configuration data:');
  console.log('   mongorestore --uri="${process.env.MONGODB_URI}" --collection=game_config --collection=bot_types --collection=bot_growth_config --collection=combat_type_advantages --collection=finance_tier_templates --collection=research --collection=maps backup-directory/RisingPunk/\n');
  
  console.log('3. Restore with custom database name:');
  console.log('   mongorestore --uri="${process.env.MONGODB_URI}" --nsFrom="RisingPunk.*" --nsTo="RisingPunk.*" backup-directory/\n');
}

/**
 * Generate Atlas-specific backup commands
 */
function generateAtlasCommands() {
  console.log('\n☁️  MongoDB Atlas Cloud Backup (Alternative)');
  console.log('==========================================\n');
  
  console.log('1. Use Atlas Data Explorer to export collections:');
  console.log('   - Go to your Atlas cluster');
  console.log('   - Click "Browse Collections"');
  console.log('   - Select collection → Export Collection');
  console.log('   - Choose JSON format\n');
  
  console.log('2. Use Atlas CLI (atlas-cli):');
  console.log('   # Install Atlas CLI:');
  console.log('   # macOS: brew install mongodb/tap/atlas-cli');
  console.log('   # Or download from: https://www.mongodb.com/docs/atlas/cli/stable/\n');
  
  console.log('   # Login to Atlas:');
  console.log('   atlas auth login\n');
  
  console.log('   # List your projects:');
  console.log('   atlas projects list\n');
  
  console.log('   # List clusters in project:');
  console.log('   atlas clusters list --project-id <your-project-id>\n');
  
  console.log('   # Create backup (if you have Atlas Backup enabled):');
  console.log('   atlas backups snapshots create <cluster-name> --project-id <your-project-id>\n');
  
  console.log('3. Use MongoDB Compass (GUI):');
  console.log('   - Connect to your Atlas cluster');
  console.log('   - Right-click collection → Export Collection');
  console.log('   - Choose format and save location\n');
}

/**
 * Generate automated backup script
 */
function generateAutomatedBackupScript() {
  const scriptPath = path.join(__dirname, 'autoBackup.sh');
  const scriptContent = `#!/bin/bash

# Automated MongoDB Atlas Backup Script
# Run this script to automatically backup your RisingPunk database

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/\${TIMESTAMP}"
MONGODB_URI="${process.env.MONGODB_URI || 'your-mongodb-uri-here'}"

echo "🚀 Starting automated backup at \${TIMESTAMP}"

# Create backup directory
mkdir -p "\${BACKUP_DIR}"

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    echo "❌ mongodump not found. Please install MongoDB Database Tools:"
    echo "   macOS: brew install mongodb/brew/mongodb-database-tools"
    echo "   Ubuntu: sudo apt-get install mongodb-database-tools"
    exit 1
fi

# Perform backup
echo "📦 Backing up database..."
mongodump --uri="\${MONGODB_URI}" --out="\${BACKUP_DIR}"

# Compress backup
echo "🗜️  Compressing backup..."
tar -czf "\${BACKUP_DIR}.tar.gz" "\${BACKUP_DIR}"

# Clean up uncompressed backup
rm -rf "\${BACKUP_DIR}"

# Move to permanent location (create this directory first)
mkdir -p ~/RisingPunk-backups
mv "\${BACKUP_DIR}.tar.gz" ~/RisingPunk-backups/

echo "✅ Backup completed successfully!"
echo "📁 Backup saved to: ~/RisingPunk-backups/\${TIMESTAMP}.tar.gz"

# Optional: Keep only last 5 backups
cd ~/RisingPunk-backups
ls -t *.tar.gz | tail -n +6 | xargs -r rm

echo "🧹 Cleaned up old backups (kept last 5)"
`;

  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  
  console.log('\n🤖 Automated Backup Script Generated');
  console.log('===================================\n');
  console.log(`Script created at: ${scriptPath}\n`);
  
  console.log('To use the automated backup script:');
  console.log('1. Make sure your MONGODB_URI is set in .env');
  console.log('2. Run: ./scripts/autoBackup.sh');
  console.log('3. Or add to crontab for automatic backups:\n');
  
  console.log('   # Add to crontab (edit with: crontab -e):');
  console.log('   # Daily backup at 2 AM:');
  console.log('   0 2 * * * cd /path/to/RisingPunk/server && ./scripts/autoBackup.sh\n');
}

/**
 * Main function
 */
function main() {
  console.log('🗄️  RisingPunk Database Backup & Restore Guide\n');
  
  generateBackupCommands();
  generateRestoreCommands();
  generateAtlasCommands();
  generateAutomatedBackupScript();
  
  console.log('\n📋 Quick Reference');
  console.log('==================\n');
  console.log('🔸 Backup: mongodump --uri="<your-uri>" --out=./backups/$(date +%Y%m%d_%H%M%S)');
  console.log('🔸 Restore: mongorestore --uri="<your-uri>" --drop backup-directory/');
  console.log('🔸 Reseed: node scripts/seedDatabase.js');
  console.log('🔸 Auto-backup: ./scripts/autoBackup.sh\n');
  
  console.log('⚠️  Important Notes:');
  console.log('====================\n');
  console.log('• Always test restore on a non-production database first');
  console.log('• Keep multiple backup versions in different locations');
  console.log('• Verify your MONGODB_URI environment variable is set');
  console.log('• Consider using Atlas Backup service for production databases');
  console.log('• User data (users, bots, battles, etc.) will NOT be restored by seeding');
  console.log('• Only game configuration and map data will be restored\n');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateBackupCommands,
  generateRestoreCommands,
  generateAtlasCommands,
  generateAutomatedBackupScript
};
