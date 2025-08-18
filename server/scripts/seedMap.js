#!/usr/bin/env node

/**
 * Map Seeding Script
 * 
 * This script populates the RisingPunk map with NPCs at random valid locations.
 * Run with: node scripts/seedMap.js
 * 
 * NPC Distribution:
 * - Level 1: 20 NPCs (random types)
 * - Level 5: 17 NPCs (random types)  
 * - Level 10: 13 NPCs (random types)
 * - Level 15: 5 NPCs (random types)
 * - Level 20: 2 NPCs (random types)
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/RisingPunk', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

// NPC configurations by level
const NPC_LEVELS = {
  1: { count: 20, npcs: ['npc-neon-shiv', 'npc-chrome-havoc', 'npc-zero-grain', 'npc-ash-circuit', 'npc-vanta-razor'] },
  5: { count: 17, npcs: ['npc-pulse-hex', 'npc-iris-vex', 'npc-rust-specter', 'npc-lume-strike', 'npc-cipher-ash'] },
  10: { count: 13, npcs: ['npc-hollow-syn', 'npc-rift-breaker', 'npc-echo-shard', 'npc-grim-vector', 'npc-nova-skorn'] },
  15: { count: 5, npcs: ['npc-talon-flux', 'npc-oblivion-byte', 'npc-drift-reaver', 'npc-static-venom', 'npc-wraith-node'] },
  20: { count: 2, npcs: ['npc-shard-viper', 'npc-kryo-jackal', 'npc-spectra-void', 'npc-iron-phage', 'npc-neuro-scythe'] }
};

// Invalid terrain types for NPC placement
const INVALID_TERRAIN = ['water', 'road', 'river'];

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
  const npcList = NPC_LEVELS[level].npcs;
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
 * Main seeding function
 */
async function seedMap() {
  try {
    console.log('🌱 Starting map seeding...');
    
    // Get the main map - use mongoose directly to avoid TypeScript import issues
    const map = await mongoose.connection.collection('maps').findOne({ name: 'main' });
    
    if (!map) {
      throw new Error('Main map not found');
    }
    
    console.log(`📍 Found map with ${map.cells.length} cells`);
    
    // Clear existing NPCs from map
    console.log('🧹 Clearing existing NPCs from map...');
    map.cells.forEach(cell => {
      if (cell.occupiedBy === 'npc') {
        cell.isOccupied = false;
        cell.occupiedBy = 'none';
        cell.entityName = '';
        cell.npcSlug = '';
        cell.npcInstanceId = '';
        cell.userId = null;
      }
    });
    
    // Place NPCs by level
    let totalPlaced = 0;
    
    for (const [level, config] of Object.entries(NPC_LEVELS)) {
      console.log(`🎯 Placing ${config.count} Level ${level} NPCs...`);
      
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
        console.log(`  ✅ Placed ${cell.entityName} at (${cell.x}, ${cell.y})`);
      }
    }
    
    // Save the updated map using native MongoDB update - only update NPC-related fields
    console.log('💾 Saving updated map...');
    
    // Create update operations for only the cells that have NPCs
    const updateOperations = [];
    map.cells.forEach((cell, index) => {
      if (cell.occupiedBy === 'npc') {
        updateOperations.push({
          updateOne: {
            filter: { _id: map._id, [`cells.${index}.x`]: cell.x, [`cells.${index}.y`]: cell.y },
            update: {
              $set: {
                [`cells.${index}.isOccupied`]: cell.isOccupied,
                [`cells.${index}.occupiedBy`]: cell.occupiedBy,
                [`cells.${index}.entityName`]: cell.entityName,
                [`cells.${index}.npcSlug`]: cell.npcSlug,
                [`cells.${index}.npcInstanceId`]: cell.npcInstanceId,
                [`cells.${index}.userId`]: cell.userId
              }
            }
          }
        });
      }
    });
    
    // Also clear any existing NPCs that are no longer valid
    const clearOperations = [];
    map.cells.forEach((cell, index) => {
      if (cell.occupiedBy === 'npc' && !cell.npcSlug) {
        clearOperations.push({
          updateOne: {
            filter: { _id: map._id, [`cells.${index}.x`]: cell.x, [`cells.${index}.y`]: cell.y },
            update: {
              $set: {
                [`cells.${index}.isOccupied`]: false,
                [`cells.${index}.occupiedBy`]: 'none',
                [`cells.${index}.entityName`]: '',
                [`cells.${index}.npcSlug`]: '',
                [`cells.${index}.npcInstanceId`]: '',
                [`cells.${index}.userId`]: null
              }
            }
          }
        });
      }
    });
    
    // Execute all updates
    if (updateOperations.length > 0) {
      await mongoose.connection.collection('maps').bulkWrite(updateOperations);
    }
    if (clearOperations.length > 0) {
      await mongoose.connection.collection('maps').bulkWrite(clearOperations);
    }
    
    console.log(`🎉 Successfully seeded map with ${totalPlaced} NPCs!`);
    console.log('\n📊 NPC Distribution:');
    for (const [level, config] of Object.entries(NPC_LEVELS)) {
      console.log(`  Level ${level}: ${config.count} NPCs`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding map:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedMap();
}

module.exports = { seedMap };
