#!/usr/bin/env node

/**
 * Complete Database Seeding Script
 * 
 * This script recreates the entire RisingPunk database from scratch.
 * Run with: node scripts/seedDatabase.js
 * 
 * What it seeds:
 * - Game configuration data
 * - Bot types and growth configs
 * - Combat type advantages
 * - Financial tier templates
 * - Research categories
 * - Main map with terrain
 * - NPCs on the map
 * 
 * WARNING: This will clear and recreate ALL data!
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/RisingPunk', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

// Game configuration data
const GAME_CONFIG = {
  userLeveling: {
    key: 'userLeveling',
    baseRequiredExp: 1000,
    multiplier: 1.2,
    precision: 2,
    maxLevel: 100,
    updatedAt: new Date()
  }
};

// Bot types configuration
const BOT_TYPES = [
  {
    key: 'guardian',
    name: 'Guardian',
    role: 'Cavalry',
    baseStats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 8,
      defense: 6
    },
    description: 'Fast cavalry unit with balanced stats',
    updatedAt: new Date()
  },
  {
    key: 'breacher',
    name: 'Breacher',
    role: 'Infantry',
    baseStats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 7,
      defense: 8
    },
    description: 'Tough infantry unit with high defense',
    updatedAt: new Date()
  },
  {
    key: 'phreak',
    name: 'Phreak',
    role: 'Ranged',
    baseStats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 6,
      defense: 5
    },
    description: 'Long-range unit with high speed',
    updatedAt: new Date()
  }
];

// Bot growth configuration
const BOT_GROWTH_CONFIG = {
  key: 'default_growth',
  shared: {
    healthPctPerLevel: 0.05,
    offensePctPerLevel: 0.05,
    defensePctPerNLevels: 0.01,
    defenseEveryNLevels: 2,
    defenseCap: 0.30,
    speedPerNLevels: 1,
    speedEveryNLevels: 5,
    speedCap: 3,
    rangeMilestones: [5, 10, 15, 20]
  },
  perTypeOverrides: {},
  updatedAt: new Date()
};

// Combat type advantages (Rock-Paper-Scissors)
const COMBAT_ADVANTAGES = {
  key: 'rps_multipliers',
  multipliers: {
    guardian: { breacher: 1.5, phreak: 0.8, guardian: 1.0 },
    breacher: { phreak: 1.5, guardian: 0.8, breacher: 1.0 },
    phreak: { guardian: 1.5, breacher: 0.8, phreak: 1.0 }
  },
  updatedAt: new Date()
};

// Financial tier templates
const FINANCIAL_TIER_TEMPLATES = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'Basic financial tier for new players',
    baseIncome: 1,
    maxProperties: 1,
    unlockLevel: 1,
    updatedAt: new Date()
  },
  {
    key: 'investor',
    name: 'Investor',
    description: 'Intermediate tier for growing players',
    baseIncome: 2,
    maxProperties: 2,
    unlockLevel: 5,
    updatedAt: new Date()
  },
  {
    key: 'tycoon',
    name: 'Tycoon',
    description: 'Advanced tier for experienced players',
    baseIncome: 5,
    maxProperties: 4,
    unlockLevel: 10,
    updatedAt: new Date()
  }
];

// Research categories
const RESEARCH_CATEGORIES = [
  {
    key: 'hack_rig_upgrade',
    name: 'Hack Rig Upgrade',
    description: 'Improve your hack rig capabilities',
    baseCost: 1000,
    costMultiplier: 1.5,
    maxLevel: 10,
    category: 'infrastructure',
    updatedAt: new Date()
  },
  {
    key: 'bot_efficiency',
    name: 'Bot Efficiency',
    description: 'Improve bot production efficiency',
    baseCost: 800,
    costMultiplier: 1.3,
    maxLevel: 15,
    category: 'production',
    updatedAt: new Date()
  },
  {
    key: 'combat_tactics',
    name: 'Combat Tactics',
    description: 'Improve battle performance',
    baseCost: 1200,
    costMultiplier: 1.4,
    maxLevel: 12,
    category: 'combat',
    updatedAt: new Date()
  },
  {
    key: 'financial_mastery',
    name: 'Financial Mastery',
    description: 'Improve income generation',
    baseCost: 1500,
    costMultiplier: 1.6,
    maxLevel: 8,
    category: 'finance',
    updatedAt: new Date()
  }
];

// NPC configurations
const NPC_CONFIGS = {
  1: { count: 20, npcs: ['npc-neon-shiv', 'npc-chrome-havoc', 'npc-zero-grain', 'npc-ash-circuit', 'npc-vanta-razor'] },
  5: { count: 17, npcs: ['npc-pulse-hex', 'npc-iris-vex', 'npc-rust-specter', 'npc-lume-strike', 'npc-cipher-ash'] },
  10: { count: 13, npcs: ['npc-hollow-syn', 'npc-rift-breaker', 'npc-echo-shard', 'npc-grim-vector', 'npc-nova-skorn'] },
  15: { count: 5, npcs: ['npc-talon-flux', 'npc-oblivion-byte', 'npc-drift-reaver', 'npc-static-venom', 'npc-wraith-node'] },
  20: { count: 2, npcs: ['npc-shard-viper', 'npc-kryo-jackal', 'npc-spectra-void', 'npc-iron-phage', 'npc-neuro-scythe'] }
};

// Invalid terrain types for NPC placement
const INVALID_TERRAIN = ['water', 'road', 'river'];

/**
 * Generate map with terrain
 */
function generateMap() {
  const cells = [];
  const GRID_SIZE = 50;
  
  // Initialize with plains
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      cells.push({
        x,
        y,
        terrain: 'plain',
        isActive: true,
        isOccupied: false,
        canBeOccupied: true,
        occupiedBy: 'none',
        entityName: '',
        npcSlug: '',
        npcInstanceId: '',
        userId: null
      });
    }
  }
  
  // Add terrain variety
  addTerrainFeatures(cells, GRID_SIZE);
  
  return {
    name: 'main',
    gridSize: GRID_SIZE,
    cells,
    version: 2,
    lastUpdated: new Date()
  };
}

/**
 * Add terrain features to the map
 */
function addTerrainFeatures(cells, gridSize) {
  // Add forests
  for (let i = 0; i < 5; i++) {
    const centerX = Math.floor(Math.random() * gridSize);
    const centerY = Math.floor(Math.random() * gridSize);
    const radius = Math.floor(Math.random() * 3) + 2;
    
    for (let y = Math.max(0, centerY - radius); y <= Math.min(gridSize - 1, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x <= Math.min(gridSize - 1, centerX + radius); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius && Math.random() < 0.7) {
          const index = y * gridSize + x;
          cells[index].terrain = 'forest';
        }
      }
    }
  }
  
  // Add mountains
  for (let i = 0; i < 3; i++) {
    const centerX = Math.floor(Math.random() * gridSize);
    const centerY = Math.floor(Math.random() * gridSize);
    const radius = Math.floor(Math.random() * 2) + 1;
    
    for (let y = Math.max(0, centerY - radius); y <= Math.min(gridSize - 1, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x <= Math.min(gridSize - 1, centerX + radius); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) {
          const index = y * gridSize + x;
          cells[index].terrain = 'mountain';
          cells[index].canBeOccupied = false;
        }
      }
    }
  }
  
  // Add rivers
  for (let i = 0; i < 2; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const length = Math.floor(Math.random() * 8) + 4;
    const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    
    for (let j = 0; j < length; j++) {
      let x, y;
      if (direction === 'horizontal') {
        x = Math.max(0, Math.min(gridSize - 1, startX + j));
        y = startY;
      } else {
        x = startX;
        y = Math.max(0, Math.min(gridSize - 1, startY + j));
      }
      
      const index = y * gridSize + x;
      cells[index].terrain = 'water';
      cells[index].canBeOccupied = false;
    }
  }
  
  // Add roads
  for (let i = 0; i < 2; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const length = Math.floor(Math.random() * 6) + 3;
    const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    
    for (let j = 0; j < length; j++) {
      let x, y;
      if (direction === 'horizontal') {
        x = Math.max(0, Math.min(gridSize - 1, startX + j));
        y = startY;
      } else {
        x = startX;
        y = Math.max(0, Math.min(gridSize - 1, startY + j));
      }
      
      const index = y * gridSize + x;
      cells[index].terrain = 'road';
    }
  }
  
  // Add some grass and dirt patches
  for (let i = 0; i < 8; i++) {
    const centerX = Math.floor(Math.random() * gridSize);
    const centerY = Math.floor(Math.random() * gridSize);
    const radius = Math.floor(Math.random() * 2) + 1;
    const terrain = Math.random() < 0.5 ? 'grass' : 'dirt';
    
    for (let y = Math.max(0, centerY - radius); y <= Math.min(gridSize - 1, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x <= Math.min(gridSize - 1, centerX + radius); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius && Math.random() < 0.8) {
          const index = y * gridSize + x;
          if (cells[index].terrain === 'plain') {
            cells[index].terrain = terrain;
          }
        }
      }
    }
  }
}

/**
 * Get random valid cells for NPC placement
 */
function getValidCells(cells, count) {
  const validCells = cells.filter(cell => 
    !cell.isOccupied && 
    cell.canBeOccupied && 
    !INVALID_TERRAIN.includes(cell.terrain)
  );
  
  if (validCells.length < count) {
    throw new Error(`Not enough valid cells. Need ${count}, found ${validCells.length}`);
  }
  
  // Shuffle and take required number
  const shuffled = validCells.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Get random NPC from a level group
 */
function getRandomNPC(level) {
  const npcList = NPC_CONFIGS[level].npcs;
  return npcList[Math.floor(Math.random() * npcList.length)];
}

/**
 * Generate unique NPC instance ID
 */
function generateNPCInstanceId(npcSlug, x, y) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${npcSlug}-${x}-${y}-${timestamp}-${random}`;
}

/**
 * Place NPCs on the map
 */
function placeNPCs(map) {
  let totalPlaced = 0;
  
  for (const [level, config] of Object.entries(NPC_CONFIGS)) {
    const validCells = getValidCells(map.cells, config.count);
    
    for (let i = 0; i < config.count; i++) {
      const cell = validCells[i];
      const npcSlug = getRandomNPC(parseInt(level));
      const npcInstanceId = generateNPCInstanceId(npcSlug, cell.x, cell.y);
      
      // Mark cell as occupied by NPC
      cell.isOccupied = true;
      cell.occupiedBy = 'npc';
      cell.entityName = npcSlug.replace('npc-', '').split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      cell.npcSlug = npcSlug;
      cell.npcInstanceId = npcInstanceId;
      
      totalPlaced++;
    }
  }
  
  return totalPlaced;
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  try {
    console.log('🚀 Starting complete database seeding...');
    
    // Clear all existing collections
    console.log('🧹 Clearing existing collections...');
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`   Cleared: ${collection.name}`);
    }
    
    // Seed game configuration
    console.log('⚙️  Seeding game configuration...');
    await db.collection('game_config').insertMany(Object.values(GAME_CONFIG));
    
    // Seed bot types
    console.log('🤖 Seeding bot types...');
    await db.collection('bot_types').insertMany(BOT_TYPES);
    
    // Seed bot growth configuration
    console.log('📈 Seeding bot growth configuration...');
    await db.collection('bot_growth_config').insertOne(BOT_GROWTH_CONFIG);
    
    // Seed combat type advantages
    console.log('⚔️  Seeding combat type advantages...');
    await db.collection('combat_type_advantages').insertOne(COMBAT_ADVANTAGES);
    
    // Seed financial tier templates
    console.log('💰 Seeding financial tier templates...');
    await db.collection('finance_tier_templates').insertMany(FINANCIAL_TIER_TEMPLATES);
    
    // Seed research categories
    console.log('🔬 Seeding research categories...');
    await db.collection('research').insertMany(RESEARCH_CATEGORIES);
    
    // Generate and seed main map
    console.log('🗺️  Generating main map...');
    const map = generateMap();
    await db.collection('maps').insertOne(map);
    
    // Place NPCs on the map
    console.log('👾 Placing NPCs on map...');
    const npcsPlaced = placeNPCs(map);
    
    // Update map with NPCs
    await db.collection('maps').updateOne(
      { name: 'main' },
      { $set: { cells: map.cells } }
    );
    
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Game config: ${Object.keys(GAME_CONFIG).length} entries`);
    console.log(`   - Bot types: ${BOT_TYPES.length} types`);
    console.log(`   - Financial tiers: ${FINANCIAL_TIER_TEMPLATES.length} tiers`);
    console.log(`   - Research categories: ${RESEARCH_CATEGORIES.length} categories`);
    console.log(`   - Map: ${map.gridSize}x${map.gridSize} grid`);
    console.log(`   - NPCs placed: ${npcsPlaced} NPCs`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
