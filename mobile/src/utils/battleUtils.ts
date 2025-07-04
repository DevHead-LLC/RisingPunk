import { BOT_CATEGORIES, getBotStats } from './battleConstants';
import { BattalionPosition } from '../types/battle';
import {
  BASE_DURATION,
  ATTACK_INTERVAL_BASE,
  RANGE_MULTIPLIER
} from './battleConstants';
import { isNeutral } from './nodeOwnership';

export const calculateMovementDuration = (speedStat: number): number => {
  return BASE_DURATION * (5 / speedStat);
};

/**
 * Calculate attack interval based on battalion speed
 * @param speedStat - Battalion speed stat
 * @returns Interval in milliseconds
 */
export const calculateAttackInterval = (speedStat: number): number => {
  return ATTACK_INTERVAL_BASE * (5 / speedStat);
};

/**
 * Calculate attack range for battalion type
 * @param battalionType - Type of battalion
 * @returns Range in pixels
 */
export const calculateAttackRange = (battalionType: string): number => {
  return BOT_CATEGORIES?.[battalionType]?.stats?.range * RANGE_MULTIPLIER || 0;
};

/**
 * Calculate total damage for battalion
 * @param battalion - Battalion to calculate damage for
 * @param isUser - Whether the battalion is user or enemy (default: true)
 * @returns Total damage value
 */
export const calculateTotalDamage = (battalion: BattalionPosition, isUser: boolean = true): number => {
  const attackPower = getBotStats(battalion.type, isUser).stats.offense;
  return attackPower * battalion.quantity;
};

/**
 * Get available nodes for battalion based on starting position
 * @param nodeIndex - Starting node index
 * @returns Array of available target node indices
 */
export const getAvailableNodes = (nodeIndex: number): number[] => {
  switch (nodeIndex) {
    case 0: return [3, 4];
    case 1: return [3, 4, 5];
    case 2: return [4, 5];
    case 6: return [3, 4];
    case 7: return [3, 4, 5];
    case 8: return [4, 5];
    default: return [];
  }
};

/**
 * Create battalion key for refs and intervals
 * @param isUser - Whether battalion is user or enemy
 * @param nodeIndex - Battalion node index
 * @returns Battalion key string
 */
export const createBattalionKey = (isUser: boolean, nodeIndex: number): string => {
  return `${isUser ? 'user' : 'enemy'}-${nodeIndex}`;
};

/**
 * Create attack interval key
 * @param isUser - Whether attacker is user or enemy
 * @param attackerNodeIndex - Attacker node index
 * @param targetNodeIndex - Target node index
 * @returns Attack interval key string
 */
export const createAttackIntervalKey = (isUser: boolean, attackerNodeIndex: number, targetNodeIndex: number): string => {
  return `${isUser ? 'user' : 'enemy'}-${attackerNodeIndex}-${targetNodeIndex}`;
};

export const validateBattalionAndTarget = (
  battalion: { quantity: number; currentHealth?: number; targetNode?: number },
  target: { type: string; index: number; position?: { x: number; y: number } },
  nodes: { x: number; y: number }[],
  currentPos: { x: number; y: number },
  range: number,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  battalionId: string,
  attackIntervals: any
): { isValid: boolean; shouldRetarget: boolean; distance: number; inRange: boolean } => {
  // Check if battalion is destroyed
  if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
    cleanupBattalion(battalionId, attackIntervals);
    return { isValid: false, shouldRetarget: false, distance: 0, inRange: false };
  }

  // Only block attacking/capturing non-neutral nodes, not movement
  if (target.type === 'node') {
    // Only block if we're in range (i.e., about to attack/capture)
    const dx = target.position?.x - currentPos.x;
    const dy = target.position?.y - currentPos.y;
    const distance = Math.sqrt((dx ?? 0) * (dx ?? 0) + (dy ?? 0) * (dy ?? 0));
    const inRange = distance <= range;
    if (inRange && !isNeutral(target.index)) {
      battalion.targetNode = undefined;
      return { isValid: false, shouldRetarget: true, distance, inRange };
    }
    // Otherwise, allow movement/pathfinding
  }

  if (!target || !target.position) {
    return { isValid: false, shouldRetarget: false, distance: 0, inRange: false };
  }
  
  // Check if battalion is already in attack range before any movement calculations
  const dx = target.position.x - currentPos.x;
  const dy = target.position.y - currentPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const inRange = distance <= range;
  
  // If in range, battalion is valid for attacking but not for moving
  if (inRange) {
    return { isValid: true, shouldRetarget: false, distance, inRange: true };
  }

  return { isValid: true, shouldRetarget: false, distance, inRange: false };
}; 