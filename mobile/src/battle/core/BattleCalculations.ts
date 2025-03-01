// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Stats
// Core calculations for the battalion stats system

import { BattalionType, BattalionStats, CombatCalculationParams, Position, TargetInfo, TargetingParams, TargetingResult, AttackPositionParams } from './types';

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

// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Universal-Targeting
function validatePosition(position: Position): void {
  if (typeof position.x !== 'number' || typeof position.y !== 'number') {
    throw new Error('Invalid position coordinates');
  }
}

function calculateDistance(a: Position, b: Position): number {
  validatePosition(a);
  validatePosition(b);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateTargetingPriority(params: TargetingParams): TargetingResult {
  const { attackerPosition, targets } = params;

  // Validate inputs
  validatePosition(attackerPosition);
  
  if (!targets.length) {
    throw new Error('No targets available');
  }

  // Validate target types and positions
  for (const target of targets) {
    if (!BASE_STATS[target.type]) {
      throw new Error('Invalid battalion type');
    }
    validatePosition(target.position);
  }

  // Find closest target based on distance only
  let closestTarget = targets[0];
  let minDistance = calculateDistance(attackerPosition, closestTarget.position);

  for (const target of targets.slice(1)) {
    const distance = calculateDistance(attackerPosition, target.position);
    if (distance < minDistance) {
      minDistance = distance;
      closestTarget = target;
    }
  }

  return { selectedTarget: closestTarget };
}

// Implementation of @battle-movement-system.mdc#Core-Movement-Properties
export function calculateMovementSpeed(type: BattalionType): number {
  // Validate battalion type
  if (!BASE_STATS[type]) {
    throw new Error('Invalid battalion type');
  }

  // Return the speed from base stats
  return BASE_STATS[type].speed;
}

// Implementation of @battle-movement-system.mdc#Movement-Constraints
function isValidPosition(position: Position): boolean {
  return typeof position.x === 'number' && typeof position.y === 'number';
}

function isHorizontalOrVertical(start: Position, end: Position): boolean {
  // Movement must be either horizontal (same y) or vertical (same x)
  return start.x === end.x || start.y === end.y;
}

export function validateMovementPath(path: Position[]): void {
  // Validate each position in the path
  for (const position of path) {
    if (!isValidPosition(position)) {
      throw new Error('Invalid position coordinates');
    }
  }

  // Check movement constraints between each pair of positions
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];

    // Movement must follow network lines (horizontal or vertical only)
    if (!isHorizontalOrVertical(current, next)) {
      throw new Error('Invalid movement: Must follow network lines');
    }
  }
}

export function calculatePathDistance(path: Position[]): number {
  let totalDistance = 0;

  // Calculate total distance along the path
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];

    // Calculate Manhattan distance (since movement is only horizontal/vertical)
    const dx = Math.abs(next.x - current.x);
    const dy = Math.abs(next.y - current.y);
    totalDistance += dx + dy;
  }

  return totalDistance;
}

// Implementation of @battle-movement-system.mdc#Attack-Range-Behavior
export function calculateAttackPosition(params: AttackPositionParams): Position {
  const { attackerType, attackerPosition, targetPosition } = params;

  // Validate inputs
  validatePosition(attackerPosition);
  validatePosition(targetPosition);
  if (!BASE_STATS[attackerType]) {
    throw new Error('Invalid battalion type');
  }

  // Get attack range for battalion type
  const range = BASE_STATS[attackerType].range;

  // Calculate current distance to target
  const currentDistance = calculateDistance(attackerPosition, targetPosition);

  // If already in range, stay in current position
  if (currentDistance <= range) {
    return attackerPosition;
  }

  // Calculate direction vector
  const dx = targetPosition.x - attackerPosition.x;
  const dy = targetPosition.y - attackerPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Calculate position at edge of range
  const scale = (distance - range) / distance;
  return {
    x: Math.round(attackerPosition.x + dx * scale),
    y: Math.round(attackerPosition.y + dy * scale)
  };
} 