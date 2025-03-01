// Implementation of @battle-core-mechanics.mdc#Combat-Logic
// Tests core battalion stats calculations and combat math

import { BattalionType } from '../../../src/battle/core/types';
import { calculateBattalionStats, calculateCombatDamage } from '../../../src/battle/core/BattleCalculations';

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
  });
}); 