/**
 * @file BattalionPositionService.ts
 * @description Battalion positioning authority - handles position updates, screen dimensions, and position calculations
 */

import { IBattalion } from '../types/battle';
import { MovementState } from '../../../mobile/src/types/battleTypes';

export class BattalionPositionService {
  private static battleScreenDimensions: Map<string, { width: number; height: number }> = new Map(); // battleId -> screen dimensions

  /**
   * Store screen dimensions for a battle (called when client requests battle state)
   */
  static setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    this.battleScreenDimensions.set(battleId, { width, height });
  }

  /**
   * Get screen dimensions for a battle (for position calculations)
   */
  static getBattleScreenDimensions(battleId: string): { width: number; height: number } {
    const dimensions = this.battleScreenDimensions.get(battleId);
    if (!dimensions) {
      throw new Error(`Screen dimensions not set for battle ${battleId}`);
    }
    return dimensions;
  }

  /**
   * Check if screen dimensions are available for a battle
   */
  static hasScreenDimensions(battleId: string): boolean {
    return this.battleScreenDimensions.has(battleId);
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
   * Clean up screen dimensions for a battle (cleanup)
   */
  static clearBattleScreenDimensions(battleId: string): void {
    this.battleScreenDimensions.delete(battleId);
  }
} 