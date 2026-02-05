#!/usr/bin/env ts-node
/**
 * Update npcs collection (battleExperienceReward, victoryReward, mapRecoverySeconds, battalions).
 * From server/:
 *   npm run update:npc-spreadsheet                    → dev DB (RisingPunk)
 *   NODE_ENV=production npm run update:npc-spreadsheet → prod DB (RisingPunkProd)
 */

import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';

const updates: Array<{
  slug: string;
  battleExperienceReward: number;
  victoryReward: number;
  mapRecoverySeconds: number;
  battalions: Array<{ type: string; quantity: number }>;
}> = [
  { slug: 'npc-neon-shiv', battleExperienceReward: 500, victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 18 }, { type: 'phreak', quantity: 11 }, { type: 'breacher', quantity: 68 }] },
  { slug: 'npc-chrome-havoc', battleExperienceReward: 500, victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 1 }, { type: 'phreak', quantity: 91 }, { type: 'breacher', quantity: 4 }] },
  { slug: 'npc-zero-grain', battleExperienceReward: 500, victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 103 }] },
  { slug: 'npc-ash-circuit', battleExperienceReward: 500, victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 29 }, { type: 'phreak', quantity: 70 }, { type: 'breacher', quantity: 29 }] },
  { slug: 'npc-vanta-razor', battleExperienceReward: 500, victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 36 }, { type: 'phreak', quantity: 63 }, { type: 'breacher', quantity: 8 }] },
  { slug: 'npc-pulse-hex', battleExperienceReward: 550, victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'phreak', quantity: 147 }] },
  { slug: 'npc-iris-vex', battleExperienceReward: 550, victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'phreak', quantity: 131 }] },
  { slug: 'npc-rust-specter', battleExperienceReward: 550, victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'phreak', quantity: 165 }] },
  { slug: 'npc-lume-strike', battleExperienceReward: 550, victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'guardian', quantity: 21 }, { type: 'phreak', quantity: 76 }, { type: 'breacher', quantity: 56 }] },
  { slug: 'npc-cipher-ash', battleExperienceReward: 550, victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'guardian', quantity: 139 }, { type: 'phreak', quantity: 6 }, { type: 'breacher', quantity: 12 }] },
  { slug: 'npc-hollow-syn', battleExperienceReward: 605, victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'guardian', quantity: 72 }, { type: 'phreak', quantity: 26 }, { type: 'breacher', quantity: 81 }] },
  { slug: 'npc-rift-breaker', battleExperienceReward: 605, victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'phreak', quantity: 166 }, { type: 'breacher', quantity: 42 }] },
  { slug: 'npc-echo-shard', battleExperienceReward: 605, victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'guardian', quantity: 180 }, { type: 'phreak', quantity: 15 }] },
  { slug: 'npc-grim-vector', battleExperienceReward: 605, victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'guardian', quantity: 42 }, { type: 'phreak', quantity: 113 }, { type: 'breacher', quantity: 77 }] },
  { slug: 'npc-nova-skorn', battleExperienceReward: 605, victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'guardian', quantity: 8 }, { type: 'breacher', quantity: 176 }] },
  { slug: 'npc-talon-flux', battleExperienceReward: 665.5, victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'guardian', quantity: 35 }, { type: 'phreak', quantity: 75 }, { type: 'breacher', quantity: 17 }] },
  { slug: 'npc-oblivion-byte', battleExperienceReward: 665.5, victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'breacher', quantity: 147 }] },
  { slug: 'npc-drift-reaver', battleExperienceReward: 665.5, victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'guardian', quantity: 29 }, { type: 'phreak', quantity: 81 }, { type: 'breacher', quantity: 37 }] },
  { slug: 'npc-static-venom', battleExperienceReward: 665.5, victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'guardian', quantity: 93 }, { type: 'phreak', quantity: 10 }, { type: 'breacher', quantity: 34 }] },
  { slug: 'npc-wraith-node', battleExperienceReward: 665.5, victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'phreak', quantity: 113 }, { type: 'breacher', quantity: 24 }] },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  const dbName = getDatabaseName();
  console.log(`📡 Connecting to ${dbName}...`);

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName,
    appName: 'updateNpcCollectionFromSpreadsheet',
  });

  const col = mongoose.connection.db!.collection('npcs');
  let modified = 0;

  for (const { slug, battleExperienceReward, victoryReward, mapRecoverySeconds, battalions } of updates) {
    const result = await col.updateOne(
      { slug },
      {
        $set: {
          battleExperienceReward,
          victoryReward,
          mapRecoverySeconds,
          battalions,
          updatedAt: new Date(),
        },
      }
    );
    if (result.modifiedCount) modified++;
  }

  console.log(`✅ Updated ${modified} of ${updates.length} NPCs.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
