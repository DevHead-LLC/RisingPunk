/**
 * @file BattalionPositionService.ts
 * @description Battalion positioning authority - handles position updates and position calculations
 */

import { IBattalion } from '../types/battle';
import { MovementState } from '../../../mobile/src/types/battleTypes';
import { ScreenDimensionService } from './ScreenDimensionService';

export class BattalionPositionService {
  /**
   * Store screen dimensions for a battle (delegates to ScreenDimensionService)
   */
  static setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    ScreenDimensionService.setBattleScreenDimensions(battleId, width, height);
  }

  /**
   * Get screen dimensions for a battle (delegates to ScreenDimensionService)
   */
  static getBattleScreenDimensions(battleId: string): { width: number; height: number } {
    return ScreenDimensionService.getBattleScreenDimensions(battleId);
  }

  /**
   * Check if screen dimensions are available for a battle (delegates to ScreenDimensionService)
   */
  static hasScreenDimensions(battleId: string): boolean {
    return ScreenDimensionService.hasScreenDimensions(battleId);
  }

  /**
   * Update battalion position from movement state (for server-side validation)
   */
  static updateBattalionPosition(battalion: IBattalion, movementState: MovementState): IBattalion {
    // For arrived battalions, update to target position
    // For moving battalions, client handles smooth interpolation
    const finalPosition = movementState.movementStatus === 'arrived' 
      ? movementState.targetPosition
      : movementState.startPosition;

    return {
      ...battalion,
      position: {
        x: finalPosition.x,
        y: finalPosition.y,
        nodeIndex: finalPosition.nodeIndex
      }
    };
  }

  /**
   * Clean up screen dimensions for a battle (delegates to ScreenDimensionService)
   */
  static clearBattleScreenDimensions(battleId: string): void {
    ScreenDimensionService.clearBattleScreenDimensions(battleId);
  }
} 