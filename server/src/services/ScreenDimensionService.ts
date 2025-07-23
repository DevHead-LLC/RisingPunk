/**
 * @file ScreenDimensionService.ts
 * @description Single source of truth for screen dimensions - authority for all screen dimension operations
 */

export interface ScreenDimensions {
  width: number;
  height: number;
}

export class ScreenDimensionService {
  private static battleScreenDimensions: Map<string, ScreenDimensions> = new Map(); // battleId -> screen dimensions

  /**
   * Validate screen dimensions
   */
  private static validateDimensions(width: number, height: number): void {
    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error('Invalid screen dimensions. Must be positive numbers.');
    }
    
    // Reasonable limits to prevent abuse
    if (width > 10000 || height > 10000) {
      throw new Error('Screen dimensions too large. Maximum 10000x10000.');
    }
  }

  /**
   * Set screen dimensions for a battle (single source of truth)
   */
  static setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    this.validateDimensions(width, height);
    this.battleScreenDimensions.set(battleId, { width, height });
  }

  /**
   * Get screen dimensions for a battle
   */
  static getBattleScreenDimensions(battleId: string): ScreenDimensions {
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
   * Update screen dimensions if they've changed
   */
  static updateScreenDimensionsIfChanged(battleId: string, width: number, height: number): boolean {
    this.validateDimensions(width, height);
    
    const currentDimensions = this.battleScreenDimensions.get(battleId);
    if (!currentDimensions) {
      // First time setting dimensions
      this.setBattleScreenDimensions(battleId, width, height);
      return true;
    }
    
    const dimensionsChanged = currentDimensions.width !== width || currentDimensions.height !== height;
    if (dimensionsChanged) {
      console.log(`📱 Screen dimensions changed for battle ${battleId}: ${currentDimensions.width}x${currentDimensions.height} → ${width}x${height}`);
      this.setBattleScreenDimensions(battleId, width, height);
      return true;
    }
    
    return false;
  }

  /**
   * Clean up screen dimensions for a battle
   */
  static clearBattleScreenDimensions(battleId: string): void {
    this.battleScreenDimensions.delete(battleId);
  }

  /**
   * Get all active battle IDs with screen dimensions
   */
  static getActiveBattleIds(): string[] {
    return Array.from(this.battleScreenDimensions.keys());
  }
} 