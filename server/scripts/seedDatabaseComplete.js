const mongoose = require('mongoose');
require('dotenv').config();

// Import separate seeding modules
const { seedCoreConfig } = require('./seedCoreConfig');
const { seedNPCs } = require('./seedNPCs');
const { seedMap } = require('./seedMap');
const { seedResearchFeatures } = require('./seedResearchFeatures');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/RisingPunk', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

// Wait for connection to be established
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

/**
 * Main seeding function that orchestrates all seeding operations
 */
async function seedDatabaseComplete() {
  try {
    console.log('🚀 Starting complete database seeding...');
    console.log('📋 This will seed all essential operational data for production');
    
    // Wait for database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for database connection...');
      await new Promise((resolve, reject) => {
        db.once('open', resolve);
        db.on('error', reject);
      });
    }
    
    // Skip clearing collections for fresh production database
    console.log('📝 Fresh production database - no collections to clear');
    
    // Seed core configuration (game_config, bot_types, etc.)
    console.log('\n📦 Phase 1: Core Configuration');
    const coreResult = await seedCoreConfig();
    if (!coreResult.success) {
      throw new Error(`Core configuration seeding failed: ${coreResult.error}`);
    }
    
    // Seed NPCs
    console.log('\n👾 Phase 2: NPC Definitions');
    const npcResult = await seedNPCs();
    if (!npcResult.success) {
      throw new Error(`NPC seeding failed: ${npcResult.error}`);
    }
    
    // Seed map and place NPCs
    console.log('\n🗺️  Phase 3: Map Generation & NPC Placement');
    const mapResult = await seedMap();
    if (!mapResult.success) {
      throw new Error(`Map seeding failed: ${mapResult.error}`);
    }
    
    // Seed active research features
    console.log('\n🔬 Phase 4: Active Research Features');
    const researchFeaturesResult = await seedResearchFeatures();
    if (!researchFeaturesResult.success) {
      throw new Error(`Research features seeding failed: ${researchFeaturesResult.error}`);
    }
    
    // Final summary
    console.log('\n✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   Core Configuration: ${Object.values(coreResult.counts).reduce((a, b) => a + b, 0)} documents`);
    console.log(`   NPC Definitions: ${npcResult.count} NPCs`);
    console.log(`   Map: ${mapResult.mapSize} cells, ${mapResult.npcsPlaced} NPCs placed`);
    console.log(`   Research Features: ${researchFeaturesResult.counts.researchFeatures} active features`);
    console.log('\n🎯 Production database is ready!');
    
    return {
      success: true,
      summary: {
        coreConfig: coreResult.counts,
        npcs: npcResult.count,
        map: {
          cells: mapResult.mapSize,
          npcsPlaced: mapResult.npcsPlaced
        },
        researchFeatures: researchFeaturesResult.counts.researchFeatures
      }
    };
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    return { success: false, error: error.message };
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabaseComplete()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Seeding completed successfully!');
        process.exit(0);
      } else {
        console.error('\n💥 Seeding failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabaseComplete };
