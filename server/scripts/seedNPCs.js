const mongoose = require('mongoose');
require('dotenv').config();

// Use existing mongoose connection (established by orchestrator)
// If not connected, establish connection for standalone execution
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/RisingPunk', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

const db = mongoose.connection;

// NPC definitions
const NPC_DEFINITIONS = [
  // Level 1 NPCs
  {
    slug: 'npc-neon-shiv',
    name: 'NeonShiv',
    title: 'Level 1 NeonShiv',
    tier: 1,
    userLevelAssociation: 1,
    battalions: [
      { type: 'guardian', quantity: 18 },
      { type: 'phreak', quantity: 11 },
      { type: 'breacher', quantity: 68 }
    ],
    battleExperienceReward: 500,
    victoryReward: 1000,
    mapRecoverySeconds: 180,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-chrome-havoc',
    name: 'ChromeHavoc',
    title: 'Level 1 ChromeHavoc',
    tier: 1,
    userLevelAssociation: 1,
    battalions: [
      { type: 'guardian', quantity: 1 },
      { type: 'phreak', quantity: 91 },
      { type: 'breacher', quantity: 4 }
    ],
    battleExperienceReward: 500,
    victoryReward: 1000,
    mapRecoverySeconds: 180,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-zero-grain',
    name: 'ZeroGrain',
    title: 'Level 1 ZeroGrain',
    tier: 1,
    userLevelAssociation: 1,
    battalions: [{ type: 'guardian', quantity: 103 }],
    battleExperienceReward: 500,
    victoryReward: 1000,
    mapRecoverySeconds: 180,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-ash-circuit',
    name: 'AshCircuit',
    title: 'Level 1 AshCircuit',
    tier: 1,
    userLevelAssociation: 1,
    battalions: [
      { type: 'guardian', quantity: 29 },
      { type: 'phreak', quantity: 70 },
      { type: 'breacher', quantity: 29 }
    ],
    battleExperienceReward: 500,
    victoryReward: 1000,
    mapRecoverySeconds: 180,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-vanta-razor',
    name: 'VantaRazor',
    title: 'Level 1 VantaRazor',
    tier: 1,
    userLevelAssociation: 1,
    battalions: [
      { type: 'guardian', quantity: 36 },
      { type: 'phreak', quantity: 63 },
      { type: 'breacher', quantity: 8 }
    ],
    battleExperienceReward: 500,
    victoryReward: 1000,
    mapRecoverySeconds: 180,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Level 5 NPCs
  {
    slug: 'npc-pulse-hex',
    name: 'PulseHex',
    title: 'Level 5 PulseHex',
    tier: 5,
    userLevelAssociation: 5,
    battalions: [{ type: 'phreak', quantity: 147 }],
    battleExperienceReward: 805,
    victoryReward: 5000,
    mapRecoverySeconds: 300,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-iris-vex',
    name: 'IrisVex',
    title: 'Level 5 IrisVex',
    tier: 5,
    userLevelAssociation: 5,
    battalions: [{ type: 'phreak', quantity: 131 }],
    battleExperienceReward: 805,
    victoryReward: 5000,
    mapRecoverySeconds: 300,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-rust-specter',
    name: 'RustSpecter',
    title: 'Level 5 RustSpecter',
    tier: 5,
    userLevelAssociation: 5,
    battalions: [{ type: 'phreak', quantity: 165 }],
    battleExperienceReward: 805,
    victoryReward: 5000,
    mapRecoverySeconds: 300,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-lume-strike',
    name: 'LumeStrike',
    title: 'Level 5 LumeStrike',
    tier: 5,
    userLevelAssociation: 5,
    battalions: [
      { type: 'guardian', quantity: 21 },
      { type: 'phreak', quantity: 76 },
      { type: 'breacher', quantity: 56 }
    ],
    battleExperienceReward: 805,
    victoryReward: 5000,
    mapRecoverySeconds: 300,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-cipher-ash',
    name: 'CipherAsh',
    title: 'Level 5 CipherAsh',
    tier: 5,
    userLevelAssociation: 5,
    battalions: [
      { type: 'guardian', quantity: 139 },
      { type: 'phreak', quantity: 6 },
      { type: 'breacher', quantity: 12 }
    ],
    battleExperienceReward: 805,
    victoryReward: 5000,
    mapRecoverySeconds: 300,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Level 10 NPCs
  {
    slug: 'npc-hollow-syn',
    name: 'HollowSyn',
    title: 'Level 10 HollowSyn',
    tier: 10,
    userLevelAssociation: 10,
    battalions: [
      { type: 'guardian', quantity: 72 },
      { type: 'phreak', quantity: 26 },
      { type: 'breacher', quantity: 81 }
    ],
    battleExperienceReward: 1296,
    victoryReward: 15000,
    mapRecoverySeconds: 420,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-rift-breaker',
    name: 'RiftBreaker',
    title: 'Level 10 RiftBreaker',
    tier: 10,
    userLevelAssociation: 10,
    battalions: [
      { type: 'phreak', quantity: 166 },
      { type: 'breacher', quantity: 42 }
    ],
    battleExperienceReward: 1296,
    victoryReward: 15000,
    mapRecoverySeconds: 420,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-echo-shard',
    name: 'EchoShard',
    title: 'Level 10 EchoShard',
    tier: 10,
    userLevelAssociation: 10,
    battalions: [
      { type: 'guardian', quantity: 180 },
      { type: 'phreak', quantity: 15 }
    ],
    battleExperienceReward: 1296,
    victoryReward: 15000,
    mapRecoverySeconds: 420,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-grim-vector',
    name: 'GrimVector',
    title: 'Level 10 GrimVector',
    tier: 10,
    userLevelAssociation: 10,
    battalions: [
      { type: 'guardian', quantity: 42 },
      { type: 'phreak', quantity: 113 },
      { type: 'breacher', quantity: 77 }
    ],
    battleExperienceReward: 1296,
    victoryReward: 15000,
    mapRecoverySeconds: 420,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-nova-skorn',
    name: 'NovaSkorn',
    title: 'Level 10 NovaSkorn',
    tier: 10,
    userLevelAssociation: 10,
    battalions: [
      { type: 'guardian', quantity: 8 },
      { type: 'breacher', quantity: 176 }
    ],
    battleExperienceReward: 1296,
    victoryReward: 15000,
    mapRecoverySeconds: 420,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Level 15 NPCs
  {
    slug: 'npc-talon-flux',
    name: 'TalonFlux',
    title: 'Level 15 TalonFlux',
    tier: 15,
    userLevelAssociation: 15,
    battalions: [
      { type: 'guardian', quantity: 35 },
      { type: 'phreak', quantity: 75 },
      { type: 'breacher', quantity: 17 }
    ],
    battleExperienceReward: 2087,
    victoryReward: 30000,
    mapRecoverySeconds: 600,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-oblivion-byte',
    name: 'OblivionByte',
    title: 'Level 15 OblivionByte',
    tier: 15,
    userLevelAssociation: 15,
    battalions: [{ type: 'breacher', quantity: 147 }],
    battleExperienceReward: 2087,
    victoryReward: 30000,
    mapRecoverySeconds: 600,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-drift-reaver',
    name: 'DriftReaver',
    title: 'Level 15 DriftReaver',
    tier: 15,
    userLevelAssociation: 15,
    battalions: [
      { type: 'guardian', quantity: 29 },
      { type: 'phreak', quantity: 81 },
      { type: 'breacher', quantity: 37 }
    ],
    battleExperienceReward: 2087,
    victoryReward: 30000,
    mapRecoverySeconds: 600,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-static-venom',
    name: 'StaticVenom',
    title: 'Level 15 StaticVenom',
    tier: 15,
    userLevelAssociation: 15,
    battalions: [
      { type: 'guardian', quantity: 93 },
      { type: 'phreak', quantity: 10 },
      { type: 'breacher', quantity: 34 }
    ],
    battleExperienceReward: 2087,
    victoryReward: 30000,
    mapRecoverySeconds: 600,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-wraith-node',
    name: 'WraithNode',
    title: 'Level 15 WraithNode',
    tier: 15,
    userLevelAssociation: 15,
    battalions: [
      { type: 'phreak', quantity: 113 },
      { type: 'breacher', quantity: 24 }
    ],
    battleExperienceReward: 2087,
    victoryReward: 30000,
    mapRecoverySeconds: 600,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Level 20 NPCs
  {
    slug: 'npc-shard-viper',
    name: 'ShardViper',
    title: 'Level 20 ShardViper',
    tier: 20,
    userLevelAssociation: 20,
    battalions: [{ type: 'guardian', quantity: 149 }],
    battleExperienceReward: 3361,
    victoryReward: 60000,
    mapRecoverySeconds: 900,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-kryo-jackal',
    name: 'KryoJackal',
    title: 'Level 20 KryoJackal',
    tier: 20,
    userLevelAssociation: 20,
    battalions: [
      { type: 'guardian', quantity: 123 },
      { type: 'phreak', quantity: 99 }
    ],
    battleExperienceReward: 3361,
    victoryReward: 60000,
    mapRecoverySeconds: 900,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-spectra-void',
    name: 'SpectraVoid',
    title: 'Level 20 SpectraVoid',
    tier: 20,
    userLevelAssociation: 20,
    battalions: [
      { type: 'guardian', quantity: 65 },
      { type: 'phreak', quantity: 140 },
      { type: 'breacher', quantity: 6 }
    ],
    battleExperienceReward: 3361,
    victoryReward: 60000,
    mapRecoverySeconds: 900,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-iron-phage',
    name: 'IronPhage',
    title: 'Level 20 IronPhage',
    tier: 20,
    userLevelAssociation: 20,
    battalions: [{ type: 'breacher', quantity: 222 }],
    battleExperienceReward: 3361,
    victoryReward: 60000,
    mapRecoverySeconds: 900,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: 'npc-neuro-scythe',
    name: 'NeuroScythe',
    title: 'Level 20 NeuroScythe',
    tier: 20,
    userLevelAssociation: 20,
    battalions: [{ type: 'phreak', quantity: 222 }],
    battleExperienceReward: 3361,
    victoryReward: 60000,
    mapRecoverySeconds: 900,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Seed NPCs collection
 */
async function seedNPCs() {
  try {
    console.log('👾 Seeding NPC definitions...');
    
    // Clear existing NPCs
    await db.collection('npcs').deleteMany({});
    console.log('   Cleared existing NPCs');
    
    // Insert NPC definitions
    await db.collection('npcs').insertMany(NPC_DEFINITIONS);
    console.log(`   Inserted ${NPC_DEFINITIONS.length} NPC definitions`);
    
    console.log('✅ NPC seeding completed successfully!');
    return { success: true, count: NPC_DEFINITIONS.length };
  } catch (error) {
    console.error('❌ NPC seeding failed:', error);
    return { success: false, error: error.message };
  }
}

// Export for use in main seeding script
module.exports = { seedNPCs, NPC_DEFINITIONS };

// Run directly if called from command line
if (require.main === module) {
  seedNPCs()
    .then((result) => {
      if (result.success) {
        console.log(`📊 NPCs seeded: ${result.count} definitions`);
        process.exit(0);
      } else {
        console.error('❌ NPC seeding failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}
