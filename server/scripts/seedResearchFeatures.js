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

// Active research features (only currently implemented features)
const ACTIVE_RESEARCH_FEATURES = [
  {
    featureId: 'antivirus',
    name: 'Antivirus',
    description: 'Deploy a protective shield that prevents other players from attacking you for a limited time. Once activated, the shield runs automatically and provides complete attack immunity until it expires.',
    categoryId: 'home-defense',
    categoryObjectId: null, // Will be set after research categories are seeded
    unlockCost: 25000,
    levelRequirement: 2,
    researchTimeHours: 4,
    isUnlocked: false,
    unlockedAt: null,
    effect: { 
      type: 'unlock', 
      value: 'antivirus', 
      target: 'system-protection' 
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Seed active research features
 */
async function seedResearchFeatures() {
  try {
    console.log('🔬 Seeding active research features...');
    
    // Get research categories to link features
    console.log('   Linking features to research categories...');
    const researchDocs = await db.collection('research').find({}).toArray();
    const categoryIdToObjectId = {};
    researchDocs.forEach(doc => {
      categoryIdToObjectId[doc.categoryId] = doc._id;
    });
    
    // Update research features with correct ObjectId references
    ACTIVE_RESEARCH_FEATURES.forEach(feature => {
      feature.categoryObjectId = categoryIdToObjectId[feature.categoryId];
    });
    
    // Seed research features
    console.log('   Seeding research features...');
    await db.collection('researchFeatures').deleteMany({});
    await db.collection('researchFeatures').insertMany(ACTIVE_RESEARCH_FEATURES);
    
    console.log('✅ Active research features seeding completed successfully!');
    return { 
      success: true, 
      counts: {
        researchFeatures: ACTIVE_RESEARCH_FEATURES.length
      }
    };
  } catch (error) {
    console.error('❌ Active research features seeding failed:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  seedResearchFeatures()
    .then(result => {
      if (result.success) {
        console.log('🎉 Seeding completed successfully!');
        console.log('📊 Seeded collections:', result.counts);
      } else {
        console.error('💥 Seeding failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { seedResearchFeatures };
