#!/usr/bin/env ts-node
/**
 * Update npcs collection (victoryReward, mapRecoverySeconds, battalions).
 * battleExperienceReward is set by updateNpcBattleExperienceReward.ts from userLevelAssociation (1.145-step curve).
 * From server/:
 *   npm run update:npc-spreadsheet                    → dev DB (RisingPunk)
 *   NODE_ENV=production npm run update:npc-spreadsheet → prod DB (RisingPunkProd)
 */

import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';

const updates: Array<{
  slug: string;
  victoryReward: number;
  mapRecoverySeconds: number;
  battalions: Array<{ type: string; quantity: number }>;
}> = [
  { slug: 'npc-neon-shiv', victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 18 }, { type: 'phreak', quantity: 11 }, { type: 'breacher', quantity: 68 }] },
  { slug: 'npc-chrome-havoc', victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 1 }, { type: 'phreak', quantity: 91 }, { type: 'breacher', quantity: 4 }] },
  { slug: 'npc-zero-grain', victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 103 }] },
  { slug: 'npc-ash-circuit', victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 29 }, { type: 'phreak', quantity: 70 }, { type: 'breacher', quantity: 29 }] },
  { slug: 'npc-vanta-razor', victoryReward: 1000, mapRecoverySeconds: 180, battalions: [{ type: 'guardian', quantity: 36 }, { type: 'phreak', quantity: 63 }, { type: 'breacher', quantity: 8 }] },
  { slug: 'npc-pulse-hex', victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'phreak', quantity: 147 }] },
  { slug: 'npc-iris-vex', victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'phreak', quantity: 131 }] },
  { slug: 'npc-rust-specter', victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'phreak', quantity: 165 }] },
  { slug: 'npc-lume-strike', victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'guardian', quantity: 21 }, { type: 'phreak', quantity: 76 }, { type: 'breacher', quantity: 56 }] },
  { slug: 'npc-cipher-ash', victoryReward: 5000, mapRecoverySeconds: 300, battalions: [{ type: 'guardian', quantity: 139 }, { type: 'phreak', quantity: 6 }, { type: 'breacher', quantity: 12 }] },
  { slug: 'npc-hollow-syn', victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'guardian', quantity: 72 }, { type: 'phreak', quantity: 26 }, { type: 'breacher', quantity: 81 }] },
  { slug: 'npc-rift-breaker', victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'phreak', quantity: 166 }, { type: 'breacher', quantity: 42 }] },
  { slug: 'npc-echo-shard', victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'guardian', quantity: 180 }, { type: 'phreak', quantity: 15 }] },
  { slug: 'npc-grim-vector', victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'guardian', quantity: 42 }, { type: 'phreak', quantity: 113 }, { type: 'breacher', quantity: 77 }] },
  { slug: 'npc-nova-skorn', victoryReward: 15000, mapRecoverySeconds: 420, battalions: [{ type: 'guardian', quantity: 8 }, { type: 'breacher', quantity: 176 }] },
  { slug: 'npc-talon-flux', victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'guardian', quantity: 35 }, { type: 'phreak', quantity: 75 }, { type: 'breacher', quantity: 17 }] },
  { slug: 'npc-oblivion-byte', victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'breacher', quantity: 147 }] },
  { slug: 'npc-drift-reaver', victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'guardian', quantity: 29 }, { type: 'phreak', quantity: 81 }, { type: 'breacher', quantity: 37 }] },
  { slug: 'npc-static-venom', victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'guardian', quantity: 93 }, { type: 'phreak', quantity: 10 }, { type: 'breacher', quantity: 34 }] },
  { slug: 'npc-wraith-node', victoryReward: 30000, mapRecoverySeconds: 600, battalions: [{ type: 'phreak', quantity: 113 }, { type: 'breacher', quantity: 24 }] },
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

  for (const { slug, victoryReward, mapRecoverySeconds, battalions } of updates) {
    const result = await col.updateOne(
      { slug },
      {
        $set: {
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
