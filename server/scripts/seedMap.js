const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/RisingPunk', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

// NPC configurations for map placement
const NPC_CONFIGS = {
  1: { count: 20, npcs: ['npc-neon-shiv', 'npc-chrome-havoc', 'npc-zero-grain', 'npc-ash-circuit', 'npc-vanta-razor'] },
  5: { count: 17, npcs: ['npc-pulse-hex', 'npc-iris-vex', 'npc-rust-specter', 'npc-lume-strike', 'npc-cipher-ash'] },
  10: { count: 13, npcs: ['npc-hollow-syn', 'npc-rift-breaker', 'npc-echo-shard', 'npc-grim-vector', 'npc-nova-skorn'] },
  15: { count: 5, npcs: ['npc-talon-flux', 'npc-oblivion-byte', 'npc-drift-reaver', 'npc-static-venom', 'npc-wraith-node'] },
  20: { count: 2, npcs: ['npc-shard-viper', 'npc-kryo-jackal', 'npc-spectra-void', 'npc-iron-phage', 'npc-neuro-scythe'] }
};

// Invalid terrain types for NPC placement
const INVALID_TERRAIN = ['water', 'road', 'river', 'mountain'];

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
  // Create 2D lookup array for O(1) cell access
  const cellGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
  cells.forEach(cell => {
    cellGrid[cell.y][cell.x] = cell;
  });
  
  // Helper function to get cell at coordinates
  const getCell = (x, y) => {
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      return cellGrid[y][x];
    }
    return null;
  };
  
  // Add forests
  for (let i = 0; i < 5; i++) {
    const centerX = Math.floor(Math.random() * gridSize);
    const centerY = Math.floor(Math.random() * gridSize);
    const radius = Math.floor(Math.random() * 8) + 3;
    
    for (let x = Math.max(0, centerX - radius); x <= Math.min(gridSize - 1, centerX + radius); x++) {
      for (let y = Math.max(0, centerY - radius); y <= Math.min(gridSize - 1, centerY + radius); y++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius && Math.random() < 0.7) {
          const cell = getCell(x, y);
          if (cell) cell.terrain = 'forest';
        }
      }
    }
  }
  
  // Add water features
  for (let i = 0; i < 3; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const length = Math.floor(Math.random() * 15) + 5;
    const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    
    for (let j = 0; j < length; j++) {
      const x = direction === 'horizontal' ? startX + j : startX;
      const y = direction === 'vertical' ? startY + j : startY;
      
      if (x < gridSize && y < gridSize) {
        const cell = getCell(x, y);
        if (cell) cell.terrain = 'water';
      }
    }
  }
  
  // Add roads
  for (let i = 0; i < 2; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const length = Math.floor(Math.random() * 20) + 10;
    const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    
    for (let j = 0; j < length; j++) {
      const x = direction === 'horizontal' ? startX + j : startX;
      const y = direction === 'vertical' ? startY + j : startY;
      
      if (x < gridSize && y < gridSize) {
        const cell = getCell(x, y);
        if (cell) cell.terrain = 'road';
      }
    }
  }
  
  // Add mountains
  for (let i = 0; i < 3; i++) {
    const centerX = Math.floor(Math.random() * gridSize);
    const centerY = Math.floor(Math.random() * gridSize);
    const radius = Math.floor(Math.random() * 6) + 2;
    
    for (let x = Math.max(0, centerX - radius); x <= Math.min(gridSize - 1, centerX + radius); x++) {
      for (let y = Math.max(0, centerY - radius); y <= Math.min(gridSize - 1, centerY + radius); y++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius && Math.random() < 0.8) {
          const cell = getCell(x, y);
          if (cell) cell.terrain = 'mountain';
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
 * Seed map and place NPCs
 */
async function seedMap() {
  try {
    console.log('🗺️  Generating main map...');
    
    // Generate map
    const map = generateMap();
    
    // Clear existing map
    await db.collection('maps').deleteMany({});
    await db.collection('maps').insertOne(map);
    console.log('   Map generated and inserted');
    
    // Place NPCs on the map
    console.log('👾 Placing NPCs on map...');
    const npcsPlaced = placeNPCs(map);
    
    // Update map with NPCs
    await db.collection('maps').updateOne(
      { name: 'main' },
      { $set: { cells: map.cells } }
    );
    
    console.log(`   Placed ${npcsPlaced} NPCs on map`);
    console.log('✅ Map seeding completed successfully!');
    
    return { 
      success: true, 
      mapSize: map.cells.length,
      npcsPlaced 
    };
  } catch (error) {
    console.error('❌ Map seeding failed:', error);
    return { success: false, error: error.message };
  }
}

// Export for use in main seeding script
module.exports = { seedMap, generateMap, placeNPCs, NPC_CONFIGS };

// Run directly if called from command line
if (require.main === module) {
  seedMap()
    .then((result) => {
      if (result.success) {
        console.log(`📊 Map seeded: ${result.mapSize} cells, ${result.npcsPlaced} NPCs placed`);
        process.exit(0);
      } else {
        console.error('❌ Map seeding failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}