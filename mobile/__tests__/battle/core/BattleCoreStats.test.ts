// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Stats
// Tests core battalion stats calculations and scaling

import { BattalionType } from '../../../src/battle/core/types';
import { calculateBattalionStats } from '../../../src/battle/core/BattleCalculations';

describe('Battalion Stats System', () => {
  // Test fixed stats for a single Guardian battalion
  // This is the most basic test case as per @testing-standards.mdc#Test-Focus-Priority
  it('should return correct fixed stats for a Guardian battalion', () => {
    const stats = calculateBattalionStats(BattalionType.Guardian, 1);
    
    // Only test the fixed stats as defined in @battle-core-mechanics.mdc#Combat-Logic
    expect(stats).toEqual({
      speed: 9,
      range: 4,
      offense: 8,
      defense: 6,
      health: 14
    });
  });

  // Test scaling stats as defined in @battle-core-mechanics.mdc#Combat-Logic#Battalion-Stats
  it('should calculate correct scaling stats for multiple units', () => {
    const stats = calculateBattalionStats(BattalionType.Guardian, 3);
    
    expect(stats).toEqual({
      // Fixed stats remain unchanged
      speed: 9,
      range: 4,
      offense: 8,
      defense: 6,
      health: 14,
      // Scaled stats as per rules
      totalHealth: 42,  // base_health * quantity
      totalAttack: 24   // base_offense * quantity
    });
  });

  // Error handling tests as per @battle-core-mechanics.mdc#Error-Prevention
  describe('Error Handling', () => {
    it('should throw error for invalid battalion type', () => {
      expect(() => {
        calculateBattalionStats('InvalidType' as BattalionType, 1);
      }).toThrow('Invalid battalion type');
    });

    it('should throw error for negative quantity', () => {
      expect(() => {
        calculateBattalionStats(BattalionType.Guardian, -1);
      }).toThrow('Battalion quantity must be positive');
    });

    it('should throw error for zero quantity', () => {
      expect(() => {
        calculateBattalionStats(BattalionType.Guardian, 0);
      }).toThrow('Battalion quantity must be positive');
    });
  });
}); 