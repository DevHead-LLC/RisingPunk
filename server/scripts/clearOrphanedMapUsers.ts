#!/usr/bin/env ts-node
/**
 * One-time sweep: find every map cell occupied by a player (userId set),
 * verify that user still exists in the User collection, and clear any cells
 * whose user no longer exists (deleted accounts). Keeps terrain; sets cell to
 * unoccupied (isOccupied: false, occupiedBy: 'none', entityName: '', userId: null).
 *
 * Run from server/: npx ts-node scripts/clearOrphanedMapUsers.ts
 * Or: NODE_ENV=production npx ts-node scripts/clearOrphanedMapUsers.ts
 */

import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';
import type { Cell, MapDoc } from './scriptMapTypes';
import { Map as MapModel } from '../src/models/Map';
import { User } from '../src/models/User';

async function clearOrphanedMapUsers(): Promise<void> {
  try {
    console.log('One-time sweep: clear map cells whose user no longer exists\n');

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set');
      process.exit(1);
    }

    const dbName = getDatabaseName();
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName,
      appName: 'clearOrphanedMapUsers-script',
    });
    console.log('✅ Connected to database:', dbName);

    const maps = await MapModel.find({}).lean();
    if (maps.length === 0) {
      console.log('📊 No maps found.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`📊 Found ${maps.length} map(s)\n`);

    let totalCleared = 0;

    for (const mapDoc of maps) {
      const map = mapDoc as MapDoc;
      const cells = map.cells || [];
      const playerCells = cells.filter(
        (c) => c.occupiedBy === 'player' && c.userId != null && mongoose.Types.ObjectId.isValid(c.userId)
      );

      if (playerCells.length === 0) {
        console.log(`🗺️  Map "${map.name}": no player-occupied cells. Skipping.\n`);
        continue;
      }

      const uniqueUserIds = [...new Set(playerCells.map((c) => String(c.userId)))];
      console.log(`🗺️  Map "${map.name}": ${playerCells.length} player cell(s), ${uniqueUserIds.length} unique user(s)`);

      const existingUserIds = new Set<string>();
      const missingUserIds = new Set<string>();

      for (const idStr of uniqueUserIds) {
        const exists = await User.exists({ _id: new mongoose.Types.ObjectId(idStr) });
        if (exists) {
          existingUserIds.add(idStr);
        } else {
          missingUserIds.add(idStr);
        }
      }

      if (missingUserIds.size === 0) {
        console.log(`   ✅ All users exist. Nothing to clear.\n`);
        continue;
      }

      console.log(`   ⚠️  ${missingUserIds.size} user(s) not found (orphaned). Clearing their cells...`);

      const mapDocMutable = await MapModel.findById(map._id);
      if (!mapDocMutable) {
        console.error(`   ❌ Could not load map document for update`);
        continue;
      }

      const cellsArray = mapDocMutable.cells as mongoose.Types.DocumentArray<Cell>;
      let clearedThisMap = 0;

      for (let i = 0; i < cellsArray.length; i++) {
        const c = cellsArray[i];
        if (c.occupiedBy !== 'player' || !c.userId) continue;
        const idStr = String(c.userId);
        if (!missingUserIds.has(idStr)) continue;

        c.isOccupied = false;
        c.occupiedBy = 'none';
        c.entityName = '';
        c.userId = null;
        clearedThisMap++;
      }

      if (clearedThisMap > 0) {
        mapDocMutable.markModified('cells');
        await mapDocMutable.save();
        totalCleared += clearedThisMap;
        console.log(`   ✅ Cleared ${clearedThisMap} cell(s) for missing user(s): ${[...missingUserIds].join(', ')}\n`);
      } else {
        console.log(`   ⚠️  No cells matched (skipping save).\n`);
      }
    }

    console.log(`✅ Done. Total cells cleared across all maps: ${totalCleared}`);
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Error:', message);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  clearOrphanedMapUsers();
}
