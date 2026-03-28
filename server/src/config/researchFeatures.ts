import { IResearchFeature } from '../models/Research';
import { ResearchFeatureDefinition, toResearchFeature } from '../models/ResearchFeatureDefinition';

/** DB-backed categories (research_feature_definitions): empty here so getResearchFeaturesAsync loads from DB only. */
const DB_BACKED_CATEGORIES: Record<string, IResearchFeature[]> = {
  'home-defense': [],
  'cash-flow': [],
  'hack-ability': [],
  'hack-crew': [],
  'investments': [],
  'npc': [],
};

export const RESEARCH_FEATURES: Record<string, IResearchFeature[]> = {
  ...DB_BACKED_CATEGORIES,

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

/**
 * Get research features for a category, merging DB definitions with file (DB wins for same id).
 * Use this so features like Antivirus can be read from research_feature_definitions.
 */
export async function getResearchFeaturesAsync(categoryId: string): Promise<IResearchFeature[]> {
  const fileList = RESEARCH_FEATURES[categoryId] || [];
  const dbDocs = await ResearchFeatureDefinition.find({ categoryId }).lean();
  const dbById = new Map(dbDocs.map(d => [d.id, toResearchFeature(d as any)]));
  const merged = fileList.map(f => dbById.get(f.id) ?? f);
  for (const d of dbDocs) {
    if (!fileList.some(f => f.id === d.id)) {
      merged.push(toResearchFeature(d as any));
    }
  }
  if (categoryId === 'cash-flow' || categoryId === 'hack-ability') {
    merged.sort((a, b) => {
      const la = a.levelRequirement ?? 0;
      const lb = b.levelRequirement ?? 0;
      if (la !== lb) return la - lb;
      const ca = a.unlockCost ?? 0;
      const cb = b.unlockCost ?? 0;
      if (ca !== cb) return ca - cb;
      return String(a.id).localeCompare(String(b.id));
    });
  }
  return merged;
}

/**
 * Get a single feature by category and id, merging DB with file (DB wins).
 */
export async function getFeatureByIdAsync(categoryId: string, featureId: string): Promise<IResearchFeature | null> {
  const features = await getResearchFeaturesAsync(categoryId);
  return features.find(f => f.id === featureId) || null;
}
