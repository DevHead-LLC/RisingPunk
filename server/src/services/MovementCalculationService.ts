/**
 * @file MovementCalculationService.ts
 * @description Pure movement calculation utilities extracted from MovementService
 */

import { IBattalion } from '../types/battle';
import { NodePosition } from '../../../mobile/src/types/battleTypes';

// Movement configuration constants (single source of truth for movement timing)
const MOVEMENT_CONFIG = {
  BASE_MOVEMENT_TIME_MS: 20000,  // Base movement time in milliseconds (20 seconds)
} as const;

export class MovementCalculationService {
  /**
   * Calculate attack range position using existing bot stats and network constraints
   */
  static calculateAttackRangePosition(battalion: IBattalion, targetNode: number, nodePositions: NodePosition[]): NodePosition {
    const battalionPos = nodePositions[battalion.position.nodeIndex];
    const targetPos = nodePositions[targetNode];
    
    // Use same scaling as client visualization: 8 pixels per range unit
    const rangeInPixels = battalion.stats.range * 8;
    
    // Calculate network-constrained range (not circular)
    const lineDistance = this.calculateNetworkDistance(battalionPos, targetPos);
    
    if (lineDistance <= rangeInPixels) {
      // Target is within range from current position - don't move
      return battalionPos;
    }

    // Calculate position along network line at attack range distance from target
    const distanceFromTarget = rangeInPixels;
    const stopDistance = lineDistance - distanceFromTarget;
    const progress = stopDistance / lineDistance;
    
    return this.interpolateAlongNetworkLine(battalionPos, targetPos, progress);
  }

  /**
   * Check if battalion is within attack range using network distance
   */
  static isWithinNetworkAttackRange(battalion: IBattalion, targetNode: number, nodePositions: NodePosition[]): boolean {
    const battalionPos = nodePositions[battalion.position.nodeIndex];
    const targetPos = nodePositions[targetNode];
    
    // Use same scaling as client visualization: 8 pixels per range unit
    const rangeInPixels = battalion.stats.range * 8;
    
    const networkDistance = this.calculateNetworkDistance(battalionPos, targetPos);
    return networkDistance <= rangeInPixels;
  }

  /**
   * Calculate distance along network line between two positions
   */
  static calculateNetworkDistance(pos1: NodePosition, pos2: NodePosition): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Interpolate position along network line using progress (0.0 to 1.0)
   */
  static interpolateAlongNetworkLine(startPos: NodePosition, targetPos: NodePosition, progress: number): NodePosition {
    return {
      x: startPos.x + (targetPos.x - startPos.x) * progress,
      y: startPos.y + (targetPos.y - startPos.y) * progress
    };
  }

  /**
   * Calculate estimated movement duration based on battalion speed
   */
  static calculateMovementDuration(battalion: IBattalion): number {
    return Math.round(MOVEMENT_CONFIG.BASE_MOVEMENT_TIME_MS / battalion.stats.speed);
  }

  /**
   * Get movement configuration constants
   */
  static getMovementConfig() {
    return MOVEMENT_CONFIG;
  }
} 