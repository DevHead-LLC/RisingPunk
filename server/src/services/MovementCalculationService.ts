/**
 * @file MovementCalculationService.ts
 * @description Pure movement calculation utilities extracted from MovementService
 */

import { IBattalion } from '../types/battle';
import { NodePosition } from '../types/battleTypes';

const MOVEMENT_CONFIG = {
  BASE_MOVEMENT_TIME_MS: 20000,
} as const;

export class MovementCalculationService {
  static calculateAttackRangePosition(battalion: IBattalion, targetNode: number, nodePositions: NodePosition[]): NodePosition {
    const battalionPos = nodePositions[battalion.position.nodeIndex];
    const targetPos = nodePositions[targetNode];
    const rangeInPixels = battalion.stats.range * 8;
    const lineDistance = this.calculateNetworkDistance(battalionPos, targetPos);
    
    if (lineDistance <= rangeInPixels) {
      return battalionPos;
    }

    const distanceFromTarget = rangeInPixels;
    const stopDistance = lineDistance - distanceFromTarget;
    const progress = stopDistance / lineDistance;
    
    return this.interpolateAlongNetworkLine(battalionPos, targetPos, progress);
  }

  static isWithinNetworkAttackRange(battalion: IBattalion, targetNode: number, nodePositions: NodePosition[]): boolean {
    const battalionPos = nodePositions[battalion.position.nodeIndex];
    const targetPos = nodePositions[targetNode];
    const rangeInPixels = battalion.stats.range * 8;
    
    return this.calculateNetworkDistance(battalionPos, targetPos) <= rangeInPixels;
  }

  static calculateNetworkDistance(pos1: NodePosition, pos2: NodePosition): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static interpolateAlongNetworkLine(startPos: NodePosition, targetPos: NodePosition, progress: number): NodePosition {
    return {
      x: startPos.x + (targetPos.x - startPos.x) * progress,
      y: startPos.y + (targetPos.y - startPos.y) * progress
    };
  }

  static calculateMovementDuration(battalion: IBattalion): number {
    return Math.round(MOVEMENT_CONFIG.BASE_MOVEMENT_TIME_MS / battalion.stats.speed);
  }

  static getMovementConfig() {
    return MOVEMENT_CONFIG;
  }

  /**
   * Interpolate along the current movement segment using an explicit elapsed time (ms).
   * Wall-clock path: {@link calculateCurrentMovementPosition}. Headless runner will use virtual elapsed here.
   */
  static calculateCurrentMovementPositionFromElapsed(
    movementState: any,
    elapsedMs: number
  ): { x: number; y: number; nodeIndex: number } {
    const totalDuration = movementState.estimatedDuration;
    const progress = Math.min(elapsedMs / totalDuration, 1.0);

    const currentPosition = this.interpolateAlongNetworkLine(
      movementState.startPosition,
      movementState.targetPosition,
      progress
    );

    const closestNodeIndex =
      progress > 0.5 ? movementState.targetPosition.nodeIndex : movementState.startPosition.nodeIndex;

    return {
      x: currentPosition.x,
      y: currentPosition.y,
      nodeIndex: closestNodeIndex,
    };
  }

  static calculateCurrentMovementPosition(movementState: any): { x: number; y: number; nodeIndex: number } {
    const elapsedTime = Date.now() - movementState.startTime;
    return this.calculateCurrentMovementPositionFromElapsed(movementState, elapsedTime);
  }
} 