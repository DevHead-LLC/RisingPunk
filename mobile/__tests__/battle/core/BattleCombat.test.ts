// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Combat
// Tests core combat calculations including damage and defense

import { BattalionType, CombatCalculationParams } from '../../../src/battle/core/types';
import { calculateCombatDamage } from '../../../src/battle/core/BattleCalculations';

describe('Battle Combat System', () => {
  describe('Combat Damage Calculations', () => {
    it('should calculate basic damage correctly', () => {
      const params: CombatCalculationParams = {
        attackerType: BattalionType.Guardian,
        attackerQuantity: 1,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      };
      
      const damage = calculateCombatDamage(params);
      expect(damage).toBeGreaterThan(0);
      expect(Number.isInteger(damage)).toBe(true);
    });

    it('should apply defense modifiers correctly', () => {
      const params: CombatCalculationParams = {
        attackerType: BattalionType.Guardian,
        attackerQuantity: 1,
        defenderType: BattalionType.Breacher,
        defenderQuantity: 1
      };
      
      const damage = calculateCombatDamage(params);
      // Breacher has high defense (8), so damage should be reduced
      expect(damage).toBeLessThan(8);
    });

    it('should scale damage with attacker quantity', () => {
      const singleAttacker = calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: 1,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      });

      const multipleAttackers = calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: 3,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      });

      // Guardian offense = 8
      // Phreak defense = 5 (5% reduction)
      // Single attacker: Math.floor(8 * 0.95) = 7
      // Multiple attackers: Math.floor((8 * 3) * 0.95) = Math.floor(24 * 0.95) = 22
      expect(multipleAttackers).toBeGreaterThan(singleAttacker);
      expect(multipleAttackers).toBe(22);
    });

    it('should ensure minimum damage of 1', () => {
      // Test with very high defense and low attack
      const params: CombatCalculationParams = {
        attackerType: BattalionType.Phreak,
        attackerQuantity: 1,
        defenderType: BattalionType.Breacher,
        defenderQuantity: 1
      };
      
      const damage = calculateCombatDamage(params);
      expect(damage).toBeGreaterThanOrEqual(1);
    });

    it('should handle edge cases correctly', () => {
      // Test maximum quantity
      const maxQuantity = calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: Number.MAX_SAFE_INTEGER,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      });
      expect(Number.isFinite(maxQuantity)).toBe(true);

      // Test all battalion type combinations
      const battalionTypes = Object.values(BattalionType);
      battalionTypes.forEach(attackerType => {
        battalionTypes.forEach(defenderType => {
          const damage = calculateCombatDamage({
            attackerType,
            attackerQuantity: 1,
            defenderType,
            defenderQuantity: 1
          });
          expect(damage).toBeGreaterThanOrEqual(1);
        });
      });
    });
  });

  describe('Combat Error Handling', () => {
    it('should throw error for invalid battalion types', () => {
      expect(() => calculateCombatDamage({
        attackerType: 'InvalidType' as BattalionType,
        attackerQuantity: 1,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      })).toThrow('Invalid battalion type');
    });

    it('should throw error for invalid quantities', () => {
      expect(() => calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: 0,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      })).toThrow('Battalion quantity must be positive');

      expect(() => calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: 1,
        defenderType: BattalionType.Phreak,
        defenderQuantity: -1
      })).toThrow('Battalion quantity must be positive');
    });
  });
}); 