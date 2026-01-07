import { IResearchFeature } from '../models/Research';

export const RESEARCH_FEATURES: Record<string, IResearchFeature[]> = {
  'home-defense': [
    {
      id: 'antivirus',
      name: 'Antivirus',
      description: 'Deploy a protective shield that prevents other players from attacking you for a limited time. Once activated, the shield runs automatically and provides complete attack immunity until it expires.',
      unlockCost: 25000,
      levelRequirement: 2,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'antivirus',
        target: 'system-protection'
      }
    },
    {
      id: 'bot-trap',
      name: 'Bot Trap 1',
      description: 'Instantly destroy 100 enemy bots in battle',
      unlockCost: 250000,
      levelRequirement: 5,
      isUnlocked: false,
      effect: {
        type: 'special',
        value: 100,
        target: 'bot-destruction'
      }
    }
  ],
  
  'hack-ability': [
    {
      id: 'battalions-per-battle',
      name: 'Add Battalion C',
      description: 'Unlock a third battalion (Battalion C) to deploy in attacking battles',
      unlockCost: 50000,
      levelRequirement: 5,
      researchTimeHours: 5,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 1,
        target: 'battalion-capacity'
      }
    },
    {
      id: 'increase-battalion-size',
      name: 'Battalion Size +250',
      description: 'Increase maximum troops per battalion from 250 to 500',
      unlockCost: 100000,
      levelRequirement: 6,
      researchTimeHours: 6,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 250,
        target: 'battalion-size'
      }
    },
    {
      id: 'starting-node',
      name: 'Starting Node',
      description: 'Choose your starting position on the battle grid',
      unlockCost: 8000,
      levelRequirement: 4,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'starting-node-selection',
        target: 'battle-strategy'
      }
    },
    {
      id: 'troops-per-battalion',
      name: 'Troops per Battalion',
      description: 'Increase the number of troops in each battalion',
      unlockCost: 12000,
      levelRequirement: 5,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 5,
        target: 'battalion-size'
      }
    },
    {
      id: 'specialist-spot-1',
      name: 'Specialist Spot 1',
      description: 'Unlock the first specialist bot slot in battalions',
      unlockCost: 15000,
      levelRequirement: 6,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'specialist-slot-1',
        target: 'battalion-composition'
      }
    },
    {
      id: 'specialist-spot-2',
      name: 'Specialist Spot 2',
      description: 'Unlock the second specialist bot slot in battalions',
      unlockCost: 20000,
      levelRequirement: 8,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'specialist-slot-2',
        target: 'battalion-composition'
      }
    },
    {
      id: 'specialist-spot-3',
      name: 'Specialist Spot 3',
      description: 'Unlock the third specialist bot slot in battalions',
      unlockCost: 25000,
      levelRequirement: 10,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'specialist-slot-3',
        target: 'battalion-composition'
      }
    },
    {
      id: 'attack-boost',
      name: 'Attack Boost',
      description: 'Increase attack power for all bots in battalions',
      unlockCost: 18000,
      levelRequirement: 7,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 15,
        target: 'bot-attack'
      }
    },
    {
      id: 'defense-boost',
      name: 'Defense Boost',
      description: 'Increase defense power for all bots in battalions',
      unlockCost: 18000,
      levelRequirement: 7,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 15,
        target: 'bot-defense'
      }
    },
    {
      id: 'speed-boost',
      name: 'Speed Boost',
      description: 'Increase movement speed for all bots in battalions',
      unlockCost: 16000,
      levelRequirement: 6,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 20,
        target: 'bot-speed'
      }
    },
    {
      id: 'range-boost',
      name: 'Range Boost',
      description: 'Increase attack range for all bots in battalions',
      unlockCost: 14000,
      levelRequirement: 5,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 1,
        target: 'bot-range'
      }
    },
    {
      id: 'health-boost',
      name: 'Health Boost',
      description: 'Increase health points for all bots in battalions',
      unlockCost: 20000,
      levelRequirement: 8,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 25,
        target: 'bot-health'
      }
    },
    {
      id: 'cost-reduction',
      name: 'Cost Reduction',
      description: 'Reduce the cost of building and maintaining bots',
      unlockCost: 22000,
      levelRequirement: 9,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 10,
        target: 'bot-cost'
      }
    },
    {
      id: 'build-speed',
      name: 'Build Speed',
      description: 'Increase the speed at which bots are assembled',
      unlockCost: 16000,
      levelRequirement: 6,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 25,
        target: 'bot-build-speed'
      }
    },
    {
      id: 'max-build-allowed',
      name: 'Max Build Allowed',
      description: 'Increase the maximum number of bots you can have in production',
      unlockCost: 30000,
      levelRequirement: 12,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 2,
        target: 'bot-production-limit'
      }
    },
    {
      id: 'specialist-bots',
      name: 'Specialist Bots',
      description: 'Unlock specialized bot types with unique abilities',
      unlockCost: 35000,
      levelRequirement: 15,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'specialist-bot-types',
        target: 'bot-variety'
      }
    }
  ],
  
  'financial': [
    {
      id: 'improve-income',
      name: 'Improve Income',
      description: 'Increase your passive income generation rate',
      unlockCost: 12000,
      levelRequirement: 4,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 20,
        target: 'income-rate'
      }
    },
    {
      id: 'reduce-debt',
      name: 'Reduce Debt',
      description: 'Lower interest rates on any outstanding debts',
      unlockCost: 18000,
      levelRequirement: 6,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 15,
        target: 'debt-interest'
      }
    },
    {
      id: 'unlock-rental-properties',
      name: 'Unlock Rental Properties',
      description: 'Gain access to rental property investment opportunities',
      unlockCost: 25000,
      levelRequirement: 8,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'rental-property-system',
        target: 'investment-options'
      }
    },
    {
      id: 'reduce-expenses',
      name: 'Reduce Expenses',
      description: 'Lower your daily operational costs',
      unlockCost: 15000,
      levelRequirement: 5,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 12,
        target: 'operational-costs'
      }
    }
  ],

  'npc': [
    {
      id: 'reduce-cost',
      name: 'Reduce Cost',
      description: 'Reduce the cost of NPC interactions and services',
      unlockCost: 20000,
      levelRequirement: 8,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 15,
        target: 'npc-cost'
      }
    },
    {
      id: 'decrease-attack-time',
      name: 'Decrease Attack Time',
      description: 'Reduce the time NPCs take to attack enemies',
      unlockCost: 25000,
      levelRequirement: 10,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 20,
        target: 'npc-attack-speed'
      }
    },
    {
      id: 'hack-speed-boost',
      name: 'Hack Speed +10%',
      description: 'Increase NPC hack speed by 10%',
      unlockCost: 30000,
      levelRequirement: 12,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 10,
        target: 'npc-hack-speed'
      }
    }
  ],

  'hack-crew': [
    {
      id: 'crew-system-unlock',
      name: 'Crew System',
      description: 'Unlock the ability to form, join, and manage hack crews',
      unlockCost: 250000,
      levelRequirement: 5,
      researchTimeHours: 7,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'hack-crew-system',
        target: 'crew-management'
      }
    },
    {
      id: 'group-hack-attack-boost',
      name: 'Group Hack Attack +10%',
      description: 'Increase group hack attack power by 10%',
      unlockCost: 35000,
      levelRequirement: 14,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 10,
        target: 'group-hack-attack'
      }
    },
    {
      id: 'group-hack-defense-boost',
      name: 'Group Hack Defense +10%',
      description: 'Increase group hack defense by 10%',
      unlockCost: 35000,
      levelRequirement: 14,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 10,
        target: 'group-hack-defense'
      }
    },
    {
      id: 'group-hack-attack-debuff',
      name: 'Group Hack Attack Debuff -10%',
      description: 'Reduce enemy group hack attack by 10%',
      unlockCost: 45000,
      levelRequirement: 16,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 10,
        target: 'enemy-group-hack-attack'
      }
    },
    {
      id: 'group-hack-defense-debuff',
      name: 'Group Hack Defense Debuff -10%',
      description: 'Reduce enemy group hack defense by 10%',
      unlockCost: 45000,
      levelRequirement: 16,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 10,
        target: 'enemy-group-hack-defense'
      }
    },
    {
      id: 'group-hack-speed-boost',
      name: 'Group Hack Speed +10%',
      description: 'Increase group hack speed by 10%',
      unlockCost: 40000,
      levelRequirement: 15,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 10,
        target: 'group-hack-speed'
      }
    }
  ],

  'gear': [
    {
      id: 'cpu-upgrade-unlock',
      name: 'CPU Upgrade Unlock',
      description: 'Unlock CPU upgrade system for enhanced processing power',
      unlockCost: 50000,
      levelRequirement: 18,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'cpu-upgrade-system',
        target: 'hardware-upgrades'
      }
    },
    {
      id: 'ram-upgrade-unlock',
      name: 'RAM Upgrade Unlock',
      description: 'Unlock RAM upgrade system for increased memory capacity',
      unlockCost: 45000,
      levelRequirement: 17,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'ram-upgrade-system',
        target: 'hardware-upgrades'
      }
    },
    {
      id: 'hard-drive-upgrade-unlock',
      name: 'Hard Drive Upgrade Unlock',
      description: 'Unlock hard drive upgrade system for more storage',
      unlockCost: 40000,
      levelRequirement: 16,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'hard-drive-upgrade-system',
        target: 'hardware-upgrades'
      }
    },
    {
      id: 'motherboard-upgrade-unlock',
      name: 'Motherboard Upgrade Unlock',
      description: 'Unlock motherboard upgrade system for better compatibility',
      unlockCost: 60000,
      levelRequirement: 20,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'motherboard-upgrade-system',
        target: 'hardware-upgrades'
      }
    },
    {
      id: 'gpu-upgrade-unlock',
      name: 'GPU Upgrade Unlock',
      description: 'Unlock GPU upgrade system for enhanced graphics processing',
      unlockCost: 55000,
      levelRequirement: 19,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'gpu-upgrade-system',
        target: 'hardware-upgrades'
      }
    },
    {
      id: 'gpu-cooler-upgrade-unlock',
      name: 'GPU Cooler Upgrade Unlock',
      description: 'Unlock GPU cooler upgrade system for better thermal performance',
      unlockCost: 35000,
      levelRequirement: 17,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'gpu-cooler-upgrade-system',
        target: 'hardware-upgrades'
      }
    },
    {
      id: 'memory-upgrade-unlock',
      name: 'Memory Upgrade Unlock',
      description: 'Unlock memory upgrade system for faster data access',
      unlockCost: 48000,
      levelRequirement: 18,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'memory-upgrade-system',
        target: 'hardware-upgrades'
      }
    },
    {
      id: 'os-upgrade-unlock',
      name: 'OS Upgrade Unlock',
      description: 'Unlock operating system upgrade system for better performance',
      unlockCost: 70000,
      levelRequirement: 22,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'os-upgrade-system',
        target: 'software-upgrades'
      }
    }
  ],

  'battle-mechanics': [
    {
      id: 'strength-boost-10',
      name: '10% Strength Boost First 5 Seconds',
      description: 'Increase strength by 10% for the first 5 seconds of battle',
      unlockCost: 30000,
      levelRequirement: 12,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 10,
        target: 'battle-strength-boost'
      }
    },
    {
      id: 'defense-boost-10',
      name: '10% Defense Boost First 5 Seconds',
      description: 'Increase defense by 10% for the first 5 seconds of battle',
      unlockCost: 30000,
      levelRequirement: 12,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 10,
        target: 'battle-defense-boost'
      }
    },
    {
      id: 'speed-boost-10',
      name: '10% Speed Boost First 5 Seconds',
      description: 'Increase speed by 10% for the first 5 seconds of battle',
      unlockCost: 30000,
      levelRequirement: 12,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 10,
        target: 'battle-speed-boost'
      }
    },
    {
      id: 'strength-debuff-10',
      name: '10% Strength Debuff First 5 Seconds',
      description: 'Reduce enemy strength by 10% for the first 5 seconds of battle',
      unlockCost: 35000,
      levelRequirement: 13,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 10,
        target: 'enemy-battle-strength'
      }
    },
    {
      id: 'defense-debuff-10',
      name: '10% Defense Debuff First 5 Seconds',
      description: 'Reduce enemy defense by 10% for the first 5 seconds of battle',
      unlockCost: 35000,
      levelRequirement: 13,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 10,
        target: 'enemy-battle-defense'
      }
    },
    {
      id: 'speed-debuff-10',
      name: '10% Speed Debuff First 5 Seconds',
      description: 'Reduce enemy speed by 10% for the first 5 seconds of battle',
      unlockCost: 35000,
      levelRequirement: 13,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 10,
        target: 'enemy-battle-speed'
      }
    },
    {
      id: 'strength-boost-15',
      name: '15% Strength Boost First 5 Seconds',
      description: 'Increase strength by 15% for the first 5 seconds of battle',
      unlockCost: 45000,
      levelRequirement: 16,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 15,
        target: 'battle-strength-boost'
      }
    },
    {
      id: 'defense-boost-15',
      name: '15% Defense Boost First 5 Seconds',
      description: 'Increase defense by 15% for the first 5 seconds of battle',
      unlockCost: 45000,
      levelRequirement: 16,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 15,
        target: 'battle-defense-boost'
      }
    },
    {
      id: 'speed-boost-15',
      name: '15% Speed Boost First 5 Seconds',
      description: 'Increase speed by 15% for the first 5 seconds of battle',
      unlockCost: 45000,
      levelRequirement: 16,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 15,
        target: 'battle-speed-boost'
      }
    },
    {
      id: 'strength-debuff-15',
      name: '15% Strength Debuff First 5 Seconds',
      description: 'Reduce enemy strength by 15% for the first 5 seconds of battle',
      unlockCost: 50000,
      levelRequirement: 17,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 15,
        target: 'enemy-battle-strength'
      }
    },
    {
      id: 'defense-debuff-15',
      name: '15% Defense Debuff First 5 Seconds',
      description: 'Reduce enemy defense by 15% for the first 5 seconds of battle',
      unlockCost: 50000,
      levelRequirement: 17,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 15,
        target: 'enemy-battle-defense'
      }
    },
    {
      id: 'speed-debuff-15',
      name: '15% Speed Debuff First 5 Seconds',
      description: 'Reduce enemy speed by 15% for the first 5 seconds of battle',
      unlockCost: 50000,
      levelRequirement: 17,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 15,
        target: 'enemy-battle-speed'
      }
    },
    {
      id: 'node-health',
      name: 'Node Health',
      description: 'Increase the health of battle grid nodes',
      unlockCost: 40000,
      levelRequirement: 15,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 25,
        target: 'node-health'
      }
    },
    {
      id: 'node-defense',
      name: 'Node Defense',
      description: 'Increase the defense of battle grid nodes',
      unlockCost: 40000,
      levelRequirement: 15,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 25,
        target: 'node-defense'
      }
    }
  ],

  'cash-flow': [
    {
      id: 'earn-money-offline',
      name: 'Earn Money Offline',
      description: 'Continue earning money even when not actively playing',
      unlockCost: 35000,
      levelRequirement: 14,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'offline-income',
        target: 'passive-income'
      }
    },
    {
      id: 'increase-rent',
      name: 'Increase Rent',
      description: 'Increase rental income from properties',
      unlockCost: 30000,
      levelRequirement: 13,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 20,
        target: 'rental-income'
      }
    },
    {
      id: 'increase-units',
      name: 'Increase Units',
      description: 'Increase the number of rental units available',
      unlockCost: 40000,
      levelRequirement: 16,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 2,
        target: 'rental-units'
      }
    },
    {
      id: 'unlock-apartments',
      name: 'Unlock Apartments',
      description: 'Unlock apartment building investment opportunities',
      unlockCost: 50000,
      levelRequirement: 18,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'apartment-investments',
        target: 'real-estate'
      }
    },
    {
      id: 'capital-expenses',
      name: 'Capital Expenses',
      description: 'Unlock capital expense management for tax benefits',
      unlockCost: 45000,
      levelRequirement: 17,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'capital-expense-system',
        target: 'tax-optimization'
      }
    }
  ],

  'investments': [
    {
      id: 'stock-investing-unlock',
      name: 'Stock Investing Unlock',
      description: 'Unlock stock market investment opportunities',
      unlockCost: 60000,
      levelRequirement: 20,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'stock-investing-system',
        target: 'market-investments'
      }
    },
    {
      id: 'accredited-investor-unlock',
      name: 'Accredited Investor Unlock',
      description: 'Unlock accredited investor opportunities and private investments',
      unlockCost: 100000,
      levelRequirement: 25,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'accredited-investor-status',
        target: 'private-investments'
      }
    }
  ],

  'construction': [
    {
      id: 'cost-reduction',
      name: 'Cost Reduction',
      description: 'Reduce construction costs for all building projects',
      unlockCost: 40000,
      levelRequirement: 16,
      isUnlocked: false,
      effect: {
        type: 'reduction',
        value: 15,
        target: 'construction-costs'
      }
    },
    {
      id: 'speed-of-build',
      name: 'Speed of Build',
      description: 'Increase construction speed for all building projects',
      unlockCost: 45000,
      levelRequirement: 17,
      isUnlocked: false,
      effect: {
        type: 'improvement',
        value: 25,
        target: 'construction-speed'
      }
    },
    {
      id: 'higher-level-buildings',
      name: 'Unlock Higher Level Buildings',
      description: 'Unlock the ability to construct higher level buildings',
      unlockCost: 60000,
      levelRequirement: 20,
      isUnlocked: false,
      effect: {
        type: 'unlock',
        value: 'higher-level-construction',
        target: 'building-capacity'
      }
    }
  ]
};

export function getResearchFeatures(categoryId: string): IResearchFeature[] {
  return RESEARCH_FEATURES[categoryId] || [];
}

export function getFeatureById(categoryId: string, featureId: string): IResearchFeature | null {
  const features = RESEARCH_FEATURES[categoryId];
  if (!features) return null;
  
  return features.find(feature => feature.id === featureId) || null;
}
