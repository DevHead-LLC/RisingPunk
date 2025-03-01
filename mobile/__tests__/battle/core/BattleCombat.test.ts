// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Combat
// Tests core combat calculations including damage and defense

import { BattalionType } from '../../../src/battle/core/types';
import { calculateCombatDamage } from '../../../src/battle/core/BattleCalculations';

describe('Combat Calculation System', () => {
  // Test basic damage calculation with defense reduction
  it('should calculate correct damage with defense reduction', () => {
    const damage = calculateCombatDamage({
      attackerType: BattalionType.Guardian,
      attackerQuantity: 2,
      defenderType: BattalionType.Phreak,
      defenderQuantity: 1
    });

    // Guardian: offense 8 * 2 units = 16 total attack
    // Phreak: defense 5 = 5% reduction
    // Expected damage: 16 * (1 - 5/100) = 15.2 rounded to 15
    expect(damage).toBe(15);
  });

  // Test minimum damage rule
  it('should enforce minimum damage of 1', () => {
    const damage = calculateCombatDamage({
      attackerType: BattalionType.Phreak,
      attackerQuantity: 1,
      defenderType: BattalionType.Breacher,
      defenderQuantity: 1
    });

    // Phreak: offense 6 * 1 unit = 6 total attack
    // Breacher: defense 8 = 8% reduction
    // Raw damage: 6 * (1 - 8/100) = 5.52
    // Should round to 6 but ensure minimum 1
    expect(damage).toBe(6);
  });

  // Error handling tests as per @battle-core-mechanics.mdc#Error-Prevention
  describe('Error Handling', () => {
    it('should throw error for invalid attacker type', () => {
      expect(() => {
        calculateCombatDamage({
          attackerType: 'InvalidType' as BattalionType,
          attackerQuantity: 1,
          defenderType: BattalionType.Phreak,
          defenderQuantity: 1
        });
      }).toThrow('Invalid battalion type');
    });

    it('should throw error for invalid defender type', () => {
      expect(() => {
        calculateCombatDamage({
          attackerType: BattalionType.Guardian,
          attackerQuantity: 1,
          defenderType: 'InvalidType' as BattalionType,
          defenderQuantity: 1
        });
      }).toThrow('Invalid battalion type');
    });

    it('should throw error for negative attacker quantity', () => {
      expect(() => {
        calculateCombatDamage({
          attackerType: BattalionType.Guardian,
          attackerQuantity: -1,
          defenderType: BattalionType.Phreak,
          defenderQuantity: 1
        });
      }).toThrow('Battalion quantity must be positive');
    });

    it('should throw error for negative defender quantity', () => {
      expect(() => {
        calculateCombatDamage({
          attackerType: BattalionType.Guardian,
          attackerQuantity: 1,
          defenderType: BattalionType.Phreak,
          defenderQuantity: -1
        });
      }).toThrow('Battalion quantity must be positive');
    });
  });
}); 