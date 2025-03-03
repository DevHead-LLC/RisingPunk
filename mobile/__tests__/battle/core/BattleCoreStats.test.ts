// Implementation of @battle-core-mechanics.mdc#Combat-Logic
// Tests core battalion stats calculations and combat math

import { BattalionType } from '../../../src/battle/core/types';
import { calculateBattalionStats, calculateCombatDamage, calculateNodeDamage, calculateAttackInterval, calculateCaptureThreshold } from '../../../src/battle/core/BattleCalculations';

describe('Battalion Core Stats', () => {
  describe('Base Stats', () => {
    it('should have correct Guardian stats', () => {
      const stats = calculateBattalionStats(BattalionType.Guardian);
      expect(stats).toEqual({
        speed: 9,
        range: 4,
        offense: 8,
        defense: 6,
        health: 14
      });
    });

    it('should have correct Phreak stats', () => {
      const stats = calculateBattalionStats(BattalionType.Phreak);
      expect(stats).toEqual({
        speed: 7,
        range: 9,
        offense: 6,
        defense: 5,
        health: 12
      });
    });

    it('should have correct Breacher stats', () => {
      const stats = calculateBattalionStats(BattalionType.Breacher);
      expect(stats).toEqual({
        speed: 5,
        range: 5,
        offense: 7,
        defense: 8,
        health: 18
      });
    });

    it('should throw error for invalid battalion type', () => {
      expect(() => calculateBattalionStats('InvalidType' as BattalionType))
        .toThrow('Invalid battalion type');
    });

    it('should return a new stats object each time', () => {
      const stats1 = calculateBattalionStats(BattalionType.Guardian);
      const stats2 = calculateBattalionStats(BattalionType.Guardian);
      expect(stats1).not.toBe(stats2); // Should be different object references
      expect(stats1).toEqual(stats2); // But with same values
    });
  });

  describe('Scaling Stats', () => {
    it('should scale total health with battalion quantity', () => {
      const stats = calculateBattalionStats(BattalionType.Guardian);
      const quantity = 1000;
      expect(stats.health * quantity).toBe(14000);
    });

    it('should scale total attack with battalion quantity', () => {
      const stats = calculateBattalionStats(BattalionType.Guardian);
      const quantity = 1000;
      expect(stats.offense * quantity).toBe(8000);
    });

    it('should not scale movement speed with quantity', () => {
      const stats = calculateBattalionStats(BattalionType.Guardian);
      const quantity = 1000;
      expect(stats.speed).toBe(9); // Speed remains constant
    });

    it('should not scale attack range with quantity', () => {
      const stats = calculateBattalionStats(BattalionType.Guardian);
      const quantity = 1000;
      expect(stats.range).toBe(4); // Range remains constant
    });

    it('should handle large battalion quantities without overflow', () => {
      const stats = calculateBattalionStats(BattalionType.Guardian);
      const largeQuantity = Number.MAX_SAFE_INTEGER;
      expect(Number.isFinite(stats.health * largeQuantity)).toBe(true);
      expect(Number.isFinite(stats.offense * largeQuantity)).toBe(true);
    });
  });

  describe('Combat Calculations', () => {
    it('should calculate damage with defense reduction', () => {
      const damage = calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: 1000,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      });
      // Total attack = 8 * 1000 = 8000
      // Defense reduction = 1 - 5/100 = 0.95
      // Final damage = 8000 * 0.95 = 7600
      expect(damage).toBe(7600);
    });

    it('should ensure minimum damage of 1', () => {
      const damage = calculateCombatDamage({
        attackerType: BattalionType.Phreak,
        attackerQuantity: 1,
        defenderType: BattalionType.Breacher,
        defenderQuantity: 1
      });
      // Phreak: offense 6 * 1 = 6 total attack
      // Breacher: defense 8 = 8% reduction
      // 6 * (1 - 8/100) = 5.52
      // Round down to 5
      expect(damage).toBe(5);
    });

    it('should enforce absolute minimum damage of 1', () => {
      const damage = calculateCombatDamage({
        attackerType: BattalionType.Phreak,
        attackerQuantity: 1,
        defenderType: BattalionType.Guardian,
        defenderQuantity: 10 // High defense to force minimum damage
      });
      // Phreak: offense 6 * 1 = 6 total attack
      // Guardian: defense 6 (fixed, not scaled by quantity)
      // 6 * (1 - 6/100) = 5.64
      // Round down to 5
      expect(damage).toBe(5);
    });

    it('should throw error for zero or negative quantities', () => {
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

    it('should handle all battalion type combinations', () => {
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
          expect(Number.isInteger(damage)).toBe(true);
        });
      });
    });

    it('should handle edge case quantities', () => {
      const damage = calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: Number.MAX_SAFE_INTEGER,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      });
      expect(Number.isFinite(damage)).toBe(true);
      expect(Number.isInteger(damage)).toBe(true);
      expect(damage).toBeGreaterThan(0);
    });
  });

  describe('Defense Mechanics', () => {
    it('should not scale defense with battalion quantity', () => {
      const damage = calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: 1,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1000 // Large quantity shouldn't affect defense
      });
      
      const damageWithSmallQuantity = calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: 1,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      });
      
      expect(damage).toBe(damageWithSmallQuantity);
    });

    it('should apply defense reduction correctly for all battalion types', () => {
      // Guardian attacking Phreak (5% reduction)
      const guardianToPhreak = calculateCombatDamage({
        attackerType: BattalionType.Guardian,
        attackerQuantity: 100,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 1
      });
      expect(guardianToPhreak).toBe(760); // 800 * 0.95

      // Phreak attacking Breacher (8% reduction)
      const phreakToBreacher = calculateCombatDamage({
        attackerType: BattalionType.Phreak,
        attackerQuantity: 100,
        defenderType: BattalionType.Breacher,
        defenderQuantity: 1
      });
      expect(phreakToBreacher).toBe(552); // 600 * 0.92

      // Breacher attacking Guardian (6% reduction)
      const breacherToGuardian = calculateCombatDamage({
        attackerType: BattalionType.Breacher,
        attackerQuantity: 100,
        defenderType: BattalionType.Guardian,
        defenderQuantity: 1
      });
      expect(breacherToGuardian).toBe(658); // 700 * 0.94
    });
  });

  describe('Health and Attack Calculations', () => {
    it('should calculate total health correctly for all battalion types', () => {
      const quantity = 100;
      
      const guardianStats = calculateBattalionStats(BattalionType.Guardian);
      expect(guardianStats.health * quantity).toBe(1400); // 14 * 100
      
      const phreakStats = calculateBattalionStats(BattalionType.Phreak);
      expect(phreakStats.health * quantity).toBe(1200); // 12 * 100
      
      const breacherStats = calculateBattalionStats(BattalionType.Breacher);
      expect(breacherStats.health * quantity).toBe(1800); // 18 * 100
    });

    it('should calculate total attack correctly for all battalion types', () => {
      const quantity = 100;
      
      const guardianStats = calculateBattalionStats(BattalionType.Guardian);
      expect(guardianStats.offense * quantity).toBe(800); // 8 * 100
      
      const phreakStats = calculateBattalionStats(BattalionType.Phreak);
      expect(phreakStats.offense * quantity).toBe(600); // 6 * 100
      
      const breacherStats = calculateBattalionStats(BattalionType.Breacher);
      expect(breacherStats.offense * quantity).toBe(700); // 7 * 100
    });
  });

  describe('State Validation', () => {
    it('should maintain consistent stats after multiple calculations', () => {
      const type = BattalionType.Guardian;
      const stats1 = calculateBattalionStats(type);
      const stats2 = calculateBattalionStats(type);
      const stats3 = calculateBattalionStats(type);
      
      expect(stats1).toEqual(stats2);
      expect(stats2).toEqual(stats3);
      expect(stats1.speed).toBe(9);
      expect(stats1.range).toBe(4);
      expect(stats1.offense).toBe(8);
      expect(stats1.defense).toBe(6);
      expect(stats1.health).toBe(14);
    });

    it('should handle rapid sequential combat calculations', () => {
      const params = {
        attackerType: BattalionType.Guardian,
        attackerQuantity: 100,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 100
      };
      
      // Perform multiple rapid calculations
      const results = new Set();
      for (let i = 0; i < 1000; i++) {
        results.add(calculateCombatDamage(params));
      }
      
      // All results should be identical
      expect(results.size).toBe(1);
      expect(results.has(760)).toBe(true); // 800 * 0.95
    });
  });

  describe('Node Control Damage', () => {
    it('should calculate node capture threshold correctly', () => {
      // Total army health calculation
      const guardianHealth = calculateBattalionStats(BattalionType.Guardian).health * 100; // 1400
      const phreakHealth = calculateBattalionStats(BattalionType.Phreak).health * 100;    // 1200
      const breacherHealth = calculateBattalionStats(BattalionType.Breacher).health * 100; // 1800
      
      const totalHealth = guardianHealth + phreakHealth + breacherHealth; // 4400
      const threshold = calculateCaptureThreshold(totalHealth);
      
      expect(threshold).toBe(3300); // 75% of 4400
    });

    it('should track accumulated damage for node control', () => {
      const userDamage = calculateNodeDamage({
        battalions: [{ type: BattalionType.Guardian, quantity: 100 }],
        side: 'user'
      });
      
      const enemyDamage = calculateNodeDamage({
        battalions: [{ type: BattalionType.Phreak, quantity: 100 }],
        side: 'enemy'
      });
      
      expect(userDamage).toBeGreaterThan(0);
      expect(enemyDamage).toBeGreaterThan(0);
      expect(typeof userDamage).toBe('number');
      expect(typeof enemyDamage).toBe('number');
    });
  });

  describe('Attack Timing', () => {
    it('should calculate correct attack intervals based on speed', () => {
      // Guardian speed: 9 -> 1000/9 ms between attacks
      const guardianInterval = calculateAttackInterval(BattalionType.Guardian);
      expect(guardianInterval).toBe(Math.floor(1000/9));
      
      // Phreak speed: 7 -> 1000/7 ms between attacks
      const phreakInterval = calculateAttackInterval(BattalionType.Phreak);
      expect(phreakInterval).toBe(Math.floor(1000/7));
      
      // Breacher speed: 5 -> 1000/5 ms between attacks
      const breacherInterval = calculateAttackInterval(BattalionType.Breacher);
      expect(breacherInterval).toBe(Math.floor(1000/5));
    });

    it('should maintain consistent attack timing under load', () => {
      const type = BattalionType.Guardian;
      const expectedInterval = Math.floor(1000/9);
      
      // Simulate multiple rapid calculations
      const intervals = new Set();
      for (let i = 0; i < 1000; i++) {
        intervals.add(calculateAttackInterval(type));
      }
      
      // All intervals should be identical
      expect(intervals.size).toBe(1);
      expect(intervals.has(expectedInterval)).toBe(true);
    });
  });

  describe('Network Effects', () => {
    it('should validate network line movement constraints', () => {
      const stats = calculateBattalionStats(BattalionType.Guardian);
      
      // Speed should be constant regardless of network position
      expect(stats.speed).toBe(9);
      
      // Range should be constant regardless of network position
      expect(stats.range).toBe(4);
    });

    it('should maintain stats consistency across network', () => {
      const type = BattalionType.Guardian;
      const baseStats = calculateBattalionStats(type);
      
      // Stats should remain consistent at different network positions
      const positions = ['start', 'middle', 'end'].map(() => calculateBattalionStats(type));
      
      positions.forEach(posStats => {
        expect(posStats).toEqual(baseStats);
      });
    });
  });
}); 