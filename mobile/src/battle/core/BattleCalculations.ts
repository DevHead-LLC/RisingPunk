// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Stats
// Core calculations for the battalion stats system

import { BattalionType, BattalionStats, CombatCalculationParams } from './types';

// Fixed stats per unit type as defined in @battle-core-mechanics.mdc
const BASE_STATS: Record<BattalionType, BattalionStats> = {
  [BattalionType.Guardian]: {
    speed: 9,
    range: 4,
    offense: 8,
    defense: 6,
    health: 14
  },
  [BattalionType.Phreak]: {
    speed: 7,
    range: 9,
    offense: 6,
    defense: 5,
    health: 12
  },
  [BattalionType.Breacher]: {
    speed: 5,
    range: 5,
    offense: 7,
    defense: 8,
    health: 18
  }
};

export function calculateBattalionStats(type: BattalionType, quantity: number): BattalionStats {
  // Validate inputs as per @battle-core-mechanics.mdc#Error-Prevention
  if (!BASE_STATS[type]) {
    throw new Error('Invalid battalion type');
  }
  
  if (quantity <= 0) {
    throw new Error('Battalion quantity must be positive');
  }

  const baseStats = BASE_STATS[type];
  
  // Only include scaled stats when quantity > 1
  return quantity > 1 ? {
    ...baseStats,
    totalHealth: baseStats.health * quantity,
    totalAttack: baseStats.offense * quantity
  } : baseStats;
}

// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Combat
export function calculateCombatDamage(params: CombatCalculationParams): number {
  const { attackerType, attackerQuantity, defenderType, defenderQuantity } = params;

  // Validate battalion types
  if (!BASE_STATS[attackerType] || !BASE_STATS[defenderType]) {
    throw new Error('Invalid battalion type');
  }

  // Validate quantities
  if (attackerQuantity <= 0 || defenderQuantity <= 0) {
    throw new Error('Battalion quantity must be positive');
  }

  // Get base stats
  const attackerStats = BASE_STATS[attackerType];
  const defenderStats = BASE_STATS[defenderType];

  // Calculate total attack power
  const totalAttack = attackerStats.offense * attackerQuantity;

  // Apply defense reduction
  const defenseMultiplier = 1 - (defenderStats.defense / 100);
  const rawDamage = totalAttack * defenseMultiplier;

  // Round to nearest integer and ensure minimum damage of 1
  return Math.max(1, Math.round(rawDamage));
} 