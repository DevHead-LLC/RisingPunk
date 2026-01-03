#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import dotenvFlow from 'dotenv-flow';
import { MapService } from '../src/services/MapService';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFileMap: Record<string, string> = {
  'development': 'dev',
  'production': 'prod'
};
const mappedNodeEnv = envFileMap[nodeEnv] || nodeEnv;

dotenvFlow.config({ 
  node_env: mappedNodeEnv,
  silent: true 
});

if (process.env.NODE_ENV !== nodeEnv) {
  process.env.NODE_ENV = nodeEnv;
}

const getDatabaseName = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  switch (nodeEnv) {
    case 'production':
      return 'RisingPunkProd';
    case 'staging':
    case 'development':
    default:
      return 'RisingPunk';
  }
};

async function updateNPCs() {
  try {
    console.log('🔄 Starting NPC update process...\n');

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: getDatabaseName(),
      appName: 'updateNPCs-script'
    });

    console.log('✅ Connected to database');
    console.log('🗺️  Updating NPCs on map...\n');

    await MapService.updateNPCsOnMap('main');

    console.log('✅ NPCs updated successfully!');
    console.log('📊 Map now has NPCs distributed across 8 levels:');
    console.log('   - Level 1: 20 NPCs (minimum 5, at least 1 of each type)');
    console.log('   - Level 2: 15 NPCs (minimum 5, at least 1 of each type)');
    console.log('   - Level 3: 12 NPCs (minimum 5, at least 1 of each type)');
    console.log('   - Level 4: 10 NPCs (minimum 5, at least 1 of each type)');
    console.log('   - Level 5: 8 NPCs (minimum 5, at least 1 of each type)');
    console.log('   - Level 6: 7 NPCs (minimum 5, at least 1 of each type)');
    console.log('   - Level 7: 6 NPCs (minimum 5, at least 1 of each type)');
    console.log('   - Level 8: 5 NPCs (minimum 5, at least 1 of each type)');
    console.log('\n✅ All NPCs have regeneration timing configured (mapRecoverySeconds)\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error updating NPCs:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  updateNPCs();
}

