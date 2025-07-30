/**
 * @file MovementCalculationService.ts
 * @description Pure movement calculation utilities extracted from MovementService
 */

import { IBattalion } from '../types/battle';
import { NodePosition } from '../../../mobile/src/types/battleTypes';

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

  static calculateCurrentMovementPosition(movementState: any): { x: number; y: number; nodeIndex: number } {
    const elapsedTime = Date.now() - movementState.startTime;
    const totalDuration = movementState.estimatedDuration;
    const progress = Math.min(elapsedTime / totalDuration, 1.0);
    
    console.log(`📊 CURRENT POSITION CALC: Battalion ${movementState.battalionId} progress ${(progress * 100).toFixed(1)}% (${elapsedTime}ms / ${totalDuration}ms)`);
    
    const currentPosition = this.interpolateAlongNetworkLine(
      movementState.startPosition,
      movementState.targetPosition,
      progress
    );
    
    console.log(`📍 INTERPOLATED POSITION: Battalion ${movementState.battalionId} at (${currentPosition.x.toFixed(1)}, ${currentPosition.y.toFixed(1)}) between start (${movementState.startPosition.x}, ${movementState.startPosition.y}) and target (${movementState.targetPosition.x}, ${movementState.targetPosition.y})`);
    
    const closestNodeIndex = progress > 0.5 ? movementState.targetPosition.nodeIndex : movementState.startPosition.nodeIndex;
    
    console.log(`🎯 POSITION: Battalion ${movementState.battalionId} ${progress > 0.5 ? '>50%' : '<50%'} progress, closer to ${progress > 0.5 ? 'target' : 'start'} node ${closestNodeIndex}`);
    
    return {
      x: currentPosition.x,
      y: currentPosition.y,
      nodeIndex: closestNodeIndex
    };
  }
} 