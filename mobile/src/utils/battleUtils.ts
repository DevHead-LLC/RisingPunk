import { BOT_CATEGORIES, getBotStats } from '../screens/DigitalBarracksScreen';
import { BattalionPosition } from '../types/battle';
import {
  BASE_DURATION,
  ATTACK_INTERVAL_BASE,
  RANGE_MULTIPLIER,
  BATTALION_TYPE_PRIORITY
} from './battleConstants';

// ============================================================================
// BATTLE UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate movement duration based on battalion speed
 * @param speedStat - Battalion speed stat
 * @returns Duration in milliseconds
 */
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
  return BOT_CATEGORIES[battalionType].stats.range * RANGE_MULTIPLIER;
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

/**
 * Sort battalions by type priority
 * @param battalions - Array of battalions to sort
 * @returns Sorted array of battalions
 */
export const sortBattalionsByPriority = (battalions: BattalionPosition[]): BattalionPosition[] => {
  return [...battalions].sort((a, b) => {
    return BATTALION_TYPE_PRIORITY[a.type] - BATTALION_TYPE_PRIORITY[b.type];
  });
}; 