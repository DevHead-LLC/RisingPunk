/**
 * @file ScreenDimensionService.ts
 * @description Single source of truth for screen dimensions - authority for all screen dimension operations
 */

export interface ScreenDimensions {
  width: number;
  height: number;
}

export class ScreenDimensionService {
  private static battleScreenDimensions: Map<string, ScreenDimensions> = new Map();

  private static validateDimensions(width: number, height: number): void {
    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error('Invalid screen dimensions. Must be positive numbers.');
    }
    
    if (width > 10000 || height > 10000) {
      throw new Error('Screen dimensions too large. Maximum 10000x10000.');
    }
  }

  static setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    this.validateDimensions(width, height);
    this.battleScreenDimensions.set(battleId, { width, height });
  }

  static getBattleScreenDimensions(battleId: string): ScreenDimensions {
    const dimensions = this.battleScreenDimensions.get(battleId);
    if (!dimensions) {
      throw new Error(`Screen dimensions not set for battle ${battleId}`);
    }
    return dimensions;
  }

  static hasScreenDimensions(battleId: string): boolean {
    return this.battleScreenDimensions.has(battleId);
  }

  static updateScreenDimensionsIfChanged(battleId: string, width: number, height: number): boolean {
    const currentDimensions = this.battleScreenDimensions.get(battleId);
    const dimensionsChanged = !currentDimensions || currentDimensions.width !== width || currentDimensions.height !== height;
    
    if (dimensionsChanged) {
      if (currentDimensions) {
        console.log(`📱 Screen dimensions changed for battle ${battleId}: ${currentDimensions.width}x${currentDimensions.height} → ${width}x${height}`);
      }
      this.setBattleScreenDimensions(battleId, width, height);
      return true;
    }
    
    return false;
  }

  static getActiveBattleIds(): string[] {
    return Array.from(this.battleScreenDimensions.keys());
  }

  static clearBattleScreenDimensions(battleId: string): void {
    this.battleScreenDimensions.delete(battleId);
  }
} 