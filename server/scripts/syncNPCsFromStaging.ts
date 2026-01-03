#!/usr/bin/env ts-node

import mongoose, { Connection } from 'mongoose';
import dotenvFlow from 'dotenv-flow';
import * as path from 'path';
import * as fs from 'fs';

dotenvFlow.config({ silent: true });

const loadEnvFile = (filename: string, prefix: string = ''): void => {
  const envPath = path.join(process.cwd(), filename);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const equalIndex = trimmedLine.indexOf('=');
        const key = trimmedLine.substring(0, equalIndex).trim();
        let value = trimmedLine.substring(equalIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (key) {
          if (key === 'MONGODB_URI' && prefix) {
            process.env[`MONGODB_URI_${prefix.toUpperCase()}`] = value;
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
};

loadEnvFile('.env.staging', 'staging');
loadEnvFile('.env.prod', 'prod');

interface NPCDocument {
  _id: any;
  slug: string;
  name: string;
  title?: string;
  tier: number;
  userLevelAssociation: number;
  battalions: Array<{ type: string; quantity: number }>;
  battleExperienceReward: number;
  victoryReward: number;
  mapRecoverySeconds: number;
  createdAt?: Date;
  updatedAt?: Date;
}

async function syncNPCsFromStaging() {
  let stagingConnection: Connection | null = null;
  let prodConnection: Connection | null = null;

  try {
    console.log('🔄 Starting NPC sync from staging to production...\n');

    const stagingUri = process.env.MONGODB_URI_STAGING || process.env.MONGODB_URI;
    const prodUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;

    if (!stagingUri || !prodUri) {
      console.error('❌ MONGODB_URI_STAGING and MONGODB_URI_PROD must be set');
      console.error('   If using same connection string, set both to MONGODB_URI');
      console.error('   Then set STAGING_DB_NAME and PROD_DB_NAME environment variables');
      process.exit(1);
    }

    const stagingDbName = process.env.STAGING_DB_NAME || 'RisingPunk';
    const prodDbName = process.env.PROD_DB_NAME || 'RisingPunkProd';

    console.log('📡 Connecting to staging database...');
    stagingConnection = await mongoose.createConnection(stagingUri, {
      dbName: stagingDbName,
      appName: 'syncNPCs-staging'
    }).asPromise();
    console.log('✅ Connected to staging database');

    console.log('📡 Connecting to production database...');
    prodConnection = await mongoose.createConnection(prodUri, {
      dbName: prodDbName,
      appName: 'syncNPCs-production'
    }).asPromise();
    console.log('✅ Connected to production database\n');

    if (!stagingConnection || !prodConnection) {
      throw new Error('Failed to establish database connections');
    }

    if (!stagingConnection.db || !prodConnection.db) {
      throw new Error('Database connections not ready');
    }

    const stagingNPCs = await stagingConnection.db.collection('npcs').find({}).toArray() as NPCDocument[];
    console.log(`📊 Found ${stagingNPCs.length} NPCs in staging database`);

    const prodNPCs = await prodConnection.db.collection('npcs').find({}).toArray() as NPCDocument[];
    console.log(`📊 Found ${prodNPCs.length} NPCs in production database`);

    const mapDoc = await prodConnection.db.collection('maps').findOne({ name: 'main' });
    const cells = (mapDoc as any)?.cells || [];
    const npcsOnMap = new Set<string>();
    cells.forEach((cell: any) => {
      if (cell.occupiedBy === 'npc' && cell.npcSlug) {
        npcsOnMap.add(cell.npcSlug);
      }
    });
    console.log(`🗺️  Found ${npcsOnMap.size} unique NPC slugs currently on the map\n`);

    const stagingSlugs = new Set(stagingNPCs.map(npc => npc.slug));
    const prodSlugs = new Set(prodNPCs.map(npc => npc.slug));

    const npcsToUpdate: string[] = [];
    const npcsToInsert: string[] = [];
    const npcsInProdButNotStaging: string[] = [];
    const npcsOnMapButNotInStaging: string[] = [];

    for (const stagingNPC of stagingNPCs) {
      if (prodSlugs.has(stagingNPC.slug)) {
        npcsToUpdate.push(stagingNPC.slug);
      } else {
        npcsToInsert.push(stagingNPC.slug);
      }
    }

    for (const prodNPC of prodNPCs) {
      if (!stagingSlugs.has(prodNPC.slug)) {
        npcsInProdButNotStaging.push(prodNPC.slug);
        if (npcsOnMap.has(prodNPC.slug)) {
          npcsOnMapButNotInStaging.push(prodNPC.slug);
        }
      }
    }

    console.log('📋 Migration Plan:');
    console.log(`   ✅ NPCs to update: ${npcsToUpdate.length}`);
    console.log(`   ➕ NPCs to insert: ${npcsToInsert.length}`);
    console.log(`   ⚠️  NPCs in prod but not staging: ${npcsInProdButNotStaging.length}`);
    if (npcsOnMapButNotInStaging.length > 0) {
      console.log(`   🚨 NPCs on map but not in staging (WILL BE PRESERVED): ${npcsOnMapButNotInStaging.length}`);
      console.log(`      Slugs: ${npcsOnMapButNotInStaging.join(', ')}`);
    }
    console.log('');

    if (npcsOnMapButNotInStaging.length > 0) {
      console.log('⚠️  WARNING: Some NPCs currently on the map are not in staging.');
      console.log('   These NPCs will be preserved in production to avoid breaking the map.\n');
    }

    console.log('🔄 Starting migration...\n');

    let updatedCount = 0;
    let insertedCount = 0;

    for (const stagingNPC of stagingNPCs) {
      const npcData = {
        slug: stagingNPC.slug,
        name: stagingNPC.name,
        title: stagingNPC.title,
        tier: stagingNPC.tier,
        userLevelAssociation: stagingNPC.userLevelAssociation,
        battalions: stagingNPC.battalions,
        battleExperienceReward: stagingNPC.battleExperienceReward,
        victoryReward: stagingNPC.victoryReward,
        mapRecoverySeconds: stagingNPC.mapRecoverySeconds,
        updatedAt: new Date()
      };

      if (!prodConnection.db) {
        throw new Error('Production database connection not ready');
      }

      const result = await prodConnection.db.collection('npcs').updateOne(
        { slug: stagingNPC.slug },
        {
          $set: npcData,
          $setOnInsert: {
            createdAt: stagingNPC.createdAt || new Date()
          }
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        insertedCount++;
        console.log(`   ➕ Inserted: ${stagingNPC.slug}`);
      } else if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`   ✅ Updated: ${stagingNPC.slug}`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount} NPCs`);
    console.log(`   ➕ Inserted: ${insertedCount} NPCs`);
    console.log(`   ⚠️  Preserved: ${npcsInProdButNotStaging.length} NPCs (not in staging)`);
    if (npcsOnMapButNotInStaging.length > 0) {
      console.log(`   🗺️  NPCs on map preserved: ${npcsOnMapButNotInStaging.length}`);
    }

    if (!prodConnection.db) {
      throw new Error('Production database connection not ready');
    }

    const finalProdNPCs = await prodConnection.db.collection('npcs').find({}).toArray();
    console.log(`\n📈 Final NPC count in production: ${finalProdNPCs.length}`);

    console.log('\n✅ Migration completed successfully!');

    if (npcsOnMapButNotInStaging.length > 0) {
      console.log('\n⚠️  NOTE: You may want to manually review and remove NPCs that are no longer needed.');
      console.log('   NPCs preserved (on map but not in staging):');
      for (const slug of npcsOnMapButNotInStaging) {
        console.log(`      - ${slug}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error syncing NPCs:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (stagingConnection) {
      await stagingConnection.close();
      console.log('\n✅ Disconnected from staging database');
    }
    if (prodConnection) {
      await prodConnection.close();
      console.log('✅ Disconnected from production database');
    }
  }
}

if (require.main === module) {
  syncNPCsFromStaging();
}

