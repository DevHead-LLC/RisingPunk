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
    maxLevel: 99,
    multiplier: 1.2,
    precision: 2,
    updatedAt: new Date()
  }
};

// Bot types configuration
const BOT_TYPES = [
  {
    key: 'guardian',
    role: 'cavalry',
    base: {
      health: 14,
      offense: 8,
      defense: 0.06,
      speed: 9,
      range: 4
    },
    updatedAt: new Date()
  },
  {
    key: 'breacher',
    role: 'infantry',
    base: {
      health: 18,
      offense: 7,
      defense: 0.08,
      speed: 5,
      range: 5
    },
    updatedAt: new Date()
  },
  {
    key: 'phreak',
    role: 'ranged',
    base: {
      health: 12,
      offense: 6,
      defense: 0.05,
      speed: 7,
      range: 9
    },
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
  enabled: true,
  multipliers: {
    breacher: { phreak: 1.2 },
    phreak: { guardian: 1.2 },
    guardian: { breacher: 1.2 }
  },
  updatedAt: new Date()
};

// Financial tier templates
const FINANCIAL_TIER_TEMPLATES = [
  {
    tierKey: 'barista',
    tierName: 'Barista (Tier 1)',
    story: 'Low income, low taxes, very frugal lifestyle. Gains come from careful budgeting.',
    incomeStatement: {
      'Gross Income': 12,
      'Taxes (5%)': -0.6,
      'Benefits (0.5%)': -0.06,
      'Net Income': 11.34,
      'Rent/Mortgage': -4,
      'Food/Groceries': -2.5,
      Transportation: -1,
      Utilities: -0.75,
      Insurance: -0.5,
      'Misc./Entertainment': -1.59,
      'Total Expenses': -9.34,
      'Net Cash Flow': 1
    },
    balanceSheet: { assets: {}, liabilities: {}, netWorthChange: 0 },
    cashFlows: {
      operating: {
        'Job Income': 12,
        'Taxes & Benefits Paid': -0.66,
        'Living Expenses Paid': -9.34,
        'Net from Operations': 1
      },
      investing: 0,
      financing: 0
    },
    updatedAt: new Date()
  },
  {
    tierKey: 'graphic_designer',
    tierName: 'Graphic Designer (Tier 2)',
    story: 'Higher income, moderate taxes, some lifestyle inflation. Gains come from skill development.',
    incomeStatement: {
      'Gross Income': 25,
      'Taxes (12%)': -3,
      'Benefits (2%)': -0.5,
      'Net Income': 21.5,
      'Rent/Mortgage': -8,
      'Food/Groceries': -4,
      Transportation: -2,
      Utilities: -1.5,
      Insurance: -1,
      'Misc./Entertainment': -3,
      'Total Expenses': -19.5,
      'Net Cash Flow': 2
    },
    balanceSheet: { assets: {}, liabilities: {}, netWorthChange: 0 },
    cashFlows: {
      operating: {
        'Job Income': 25,
        'Taxes & Benefits Paid': -3.5,
        'Living Expenses Paid': -19.5,
        'Net from Operations': 2
      },
      investing: 0,
      financing: 0
    },
    updatedAt: new Date()
  },
  {
    tierKey: 'corporate_lawyer',
    tierName: 'Corporate Lawyer (Tier 3)',
    story: 'High income, high taxes, significant lifestyle inflation. Gains come from professional expertise.',
    incomeStatement: {
      'Gross Income': 60,
      'Taxes (25%)': -15,
      'Benefits (3%)': -1.8,
      'Net Income': 43.2,
      'Rent/Mortgage': -20,
      'Food/Groceries': -8,
      Transportation: -5,
      Utilities: -3,
      Insurance: -2,
      'Misc./Entertainment': -5.2,
      'Total Expenses': -43.2,
      'Net Cash Flow': 0
    },
    balanceSheet: { assets: {}, liabilities: {}, netWorthChange: 0 },
    cashFlows: {
      operating: {
        'Job Income': 60,
        'Taxes & Benefits Paid': -16.8,
        'Living Expenses Paid': -43.2,
        'Net from Operations': 0
      },
      investing: 0,
      financing: 0
    },
    updatedAt: new Date()
  }
];

// Research categories
const RESEARCH_CATEGORIES = [
  {
    categoryId: 'home-defense',
    name: 'Home Defense',
    levelRequirement: 2,
    balanceRequirement: 10000,
    dependencies: [],
    image: 'homeDefenseResearch.png',
    description: 'Unlock home defense research capabilities',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'hack-ability',
    name: 'Hack Ability',
    levelRequirement: 5,
    balanceRequirement: 20000,
    dependencies: ['home-defense'],
    image: 'hackerResearch.png',
    description: 'Unlock advanced hacking research',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'financial',
    name: 'Financial',
    levelRequirement: 5,
    balanceRequirement: 20000,
    dependencies: ['home-defense'],
    image: 'financialResearchMale.png',
    description: 'Unlock financial research capabilities',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'hack-crew',
    name: 'Hack Crew',
    levelRequirement: 10,
    balanceRequirement: 50000,
    dependencies: ['hack-ability', 'financial'],
    image: 'hackCrewResearch.png',
    description: 'Unlock hack crew research',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'npc',
    name: 'NPC',
    levelRequirement: 10,
    balanceRequirement: 50000,
    dependencies: ['hack-ability', 'financial'],
    image: 'npcResearch.png',
    description: 'Unlock NPC research capabilities',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'cash-flow',
    name: 'Cash Flow',
    levelRequirement: 10,
    balanceRequirement: 50000,
    dependencies: ['hack-ability', 'financial'],
    image: 'cashFlowResearch.png',
    description: 'Unlock cash flow research',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'construction',
    name: 'Construction',
    levelRequirement: 10,
    balanceRequirement: 50000,
    dependencies: ['hack-ability', 'financial'],
    image: 'constructionResearch.png',
    description: 'Unlock construction research',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'battle-mechanics',
    name: 'Battle Mechanics',
    levelRequirement: 20,
    balanceRequirement: 150000,
    dependencies: ['hack-crew', 'npc', 'cash-flow', 'construction'],
    image: 'battleMechanicsResearch.png',
    description: 'Unlock battle mechanics research',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'gear',
    name: 'Gear',
    levelRequirement: 0,
    balanceRequirement: 400000,
    dependencies: ['battle-mechanics'],
    image: 'hackerGearResearch.png',
    description: 'Unlock gear research capabilities',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    categoryId: 'investments',
    name: 'Investments',
    levelRequirement: 30,
    balanceRequirement: 500000,
    dependencies: ['gear'],
    image: 'investmentResearch.png',
    description: 'Unlock investment research capabilities',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];


/**
 * Seed core configuration collections
 */
async function seedCoreConfig() {
  try {
    console.log('⚙️  Seeding core configuration...');
    
    // Seed game configuration
    console.log('   Seeding game configuration...');
    await db.collection('game_config').deleteMany({});
    await db.collection('game_config').insertMany(Object.values(GAME_CONFIG));
    
    // Seed bot types
    console.log('   Seeding bot types...');
    await db.collection('bot_types').deleteMany({});
    await db.collection('bot_types').insertMany(BOT_TYPES);
    
    // Seed bot growth configuration
    console.log('   Seeding bot growth configuration...');
    await db.collection('bot_growth_config').deleteMany({});
    await db.collection('bot_growth_config').insertOne(BOT_GROWTH_CONFIG);
    
    // Seed combat type advantages
    console.log('   Seeding combat type advantages...');
    await db.collection('combat_type_advantages').deleteMany({});
    await db.collection('combat_type_advantages').insertOne(COMBAT_ADVANTAGES);
    
    // Seed financial tier templates
    console.log('   Seeding financial tier templates...');
    await db.collection('finance_tier_templates').deleteMany({});
    await db.collection('finance_tier_templates').insertMany(FINANCIAL_TIER_TEMPLATES);
    
    // Seed research categories
    console.log('   Seeding research categories...');
    await db.collection('research').deleteMany({});
    await db.collection('research').insertMany(RESEARCH_CATEGORIES);
    
    console.log('✅ Core configuration seeding completed successfully!');
    return { 
      success: true, 
      counts: {
        game_config: Object.keys(GAME_CONFIG).length,
        bot_types: BOT_TYPES.length,
        bot_growth_config: 1,
        combat_type_advantages: 1,
        finance_tier_templates: FINANCIAL_TIER_TEMPLATES.length,
        research: RESEARCH_CATEGORIES.length
      }
    };
  } catch (error) {
    console.error('❌ Core configuration seeding failed:', error);
    return { success: false, error: error.message };
  }
}

// Export for use in main seeding script
module.exports = { 
  seedCoreConfig, 
  GAME_CONFIG, 
  BOT_TYPES, 
  BOT_GROWTH_CONFIG, 
  COMBAT_ADVANTAGES, 
  FINANCIAL_TIER_TEMPLATES, 
  RESEARCH_CATEGORIES 
};

// Run directly if called from command line
if (require.main === module) {
  seedCoreConfig()
    .then((result) => {
      if (result.success) {
        console.log('📊 Core configuration seeded:');
        Object.entries(result.counts).forEach(([collection, count]) => {
          console.log(`   ${collection}: ${count} documents`);
        });
        process.exit(0);
      } else {
        console.error('❌ Core configuration seeding failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}
