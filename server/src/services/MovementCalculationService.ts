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

  /**
   * Calculate current position of a battalion during movement
   * Uses time-based interpolation to determine where the battalion is at this moment
   */
  static calculateCurrentMovementPosition(movementState: any): { x: number; y: number; nodeIndex: number } {
    const elapsedTime = Date.now() - movementState.startTime;
    const totalDuration = movementState.estimatedDuration;
    
    // Calculate movement progress (0.0 = start, 1.0 = end)
    const progress = Math.min(elapsedTime / totalDuration, 1.0);
    
    console.log(`📊 CURRENT POSITION CALC: Battalion ${movementState.battalionId} progress ${(progress * 100).toFixed(1)}% (${elapsedTime}ms / ${totalDuration}ms)`);
    
    // Interpolate between start and target positions
    const currentPosition = this.interpolateAlongNetworkLine(
      movementState.startPosition,
      movementState.targetPosition,
      progress
    );
    
    console.log(`📍 INTERPOLATED POSITION: Battalion ${movementState.battalionId} at (${currentPosition.x.toFixed(1)}, ${currentPosition.y.toFixed(1)}) between start (${movementState.startPosition.x}, ${movementState.startPosition.y}) and target (${movementState.targetPosition.x}, ${movementState.targetPosition.y})`);
    
    // CRITICAL FIX: Determine which node the battalion is actually closest to
    // Instead of always using the starting node, find the nearest node to the actual position
    let closestNodeIndex = movementState.startPosition.nodeIndex; // Fallback to start node
    
    // If we're more than halfway to the target, we're probably closer to the target node
    if (progress > 0.5) {
      closestNodeIndex = movementState.targetPosition.nodeIndex;
      console.log(`🎯 POSITION: Battalion ${movementState.battalionId} >50% progress, closer to target node ${closestNodeIndex}`);
    } else {
      console.log(`🎯 POSITION: Battalion ${movementState.battalionId} <50% progress, closer to start node ${closestNodeIndex}`);
    }
    
    return {
      x: currentPosition.x,
      y: currentPosition.y,
      nodeIndex: closestNodeIndex // Use closest node, not always start node
    };
  }
} 