// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Stats
// Tests for core type validation and constraints

import {
  BattalionType,
  BattalionStats,
  CombatCalculationParams,
  Position,
  TargetInfo,
  TargetingParams,
  TargetingResult,
  AttackPositionParams,
  NodeOwnership,
  NodeControlState,
  NodeInfo
} from '../../../src/battle/core/types';

describe('Battle System Types', () => {
  describe('BattalionStats', () => {
    it('should validate required stats', () => {
      const validStats: BattalionStats = {
        speed: 9,
        range: 4,
        offense: 8,
        defense: 6,
        health: 14
      };
      expect(validStats).toBeDefined();
    });

    it('should allow optional scaled stats', () => {
      const statsWithScaled: BattalionStats = {
        speed: 9,
        range: 4,
        offense: 8,
        defense: 6,
        health: 14,
        totalHealth: 1400,  // 14 * 100 units
        totalAttack: 800    // 8 * 100 units
      };
      expect(statsWithScaled.totalHealth).toBe(1400);
      expect(statsWithScaled.totalAttack).toBe(800);
    });
  });

  describe('CombatCalculationParams', () => {
    it('should validate combat parameters', () => {
      const validParams: CombatCalculationParams = {
        attackerType: BattalionType.Guardian,
        attackerQuantity: 100,
        defenderType: BattalionType.Phreak,
        defenderQuantity: 50
      };
      expect(validParams).toBeDefined();
      expect(Object.values(BattalionType)).toContain(validParams.attackerType);
      expect(Object.values(BattalionType)).toContain(validParams.defenderType);
    });
  });

  describe('Position', () => {
    it('should validate position coordinates', () => {
      const validPosition: Position = { x: 100, y: 200 };
      expect(validPosition.x).toBeDefined();
      expect(validPosition.y).toBeDefined();
      expect(typeof validPosition.x).toBe('number');
      expect(typeof validPosition.y).toBe('number');
    });
  });

  describe('TargetInfo', () => {
    it('should validate target information', () => {
      const validTarget: TargetInfo = {
        type: BattalionType.Breacher,
        position: { x: 100, y: 200 },
        id: 'target-1'
      };
      expect(validTarget).toBeDefined();
      expect(Object.values(BattalionType)).toContain(validTarget.type);
      expect(validTarget.position).toBeDefined();
      expect(validTarget.id).toBeDefined();
    });
  });

  describe('TargetingParams', () => {
    it('should validate targeting parameters', () => {
      const validParams: TargetingParams = {
        attackerPosition: { x: 0, y: 0 },
        targets: [
          {
            type: BattalionType.Guardian,
            position: { x: 100, y: 100 },
            id: 'target-1'
          }
        ]
      };
      expect(validParams).toBeDefined();
      expect(validParams.attackerPosition).toBeDefined();
      expect(Array.isArray(validParams.targets)).toBe(true);
    });

    it('should handle optional current target', () => {
      const paramsWithTarget: TargetingParams = {
        attackerPosition: { x: 0, y: 0 },
        targets: [],
        currentTargetId: 'current-target'
      };
      expect(paramsWithTarget.currentTargetId).toBeDefined();
    });
  });

  describe('NodeOwnership', () => {
    it('should validate node ownership values', () => {
      expect(Object.values(NodeOwnership)).toContain(NodeOwnership.User);
      expect(Object.values(NodeOwnership)).toContain(NodeOwnership.Neutral);
      expect(Object.values(NodeOwnership)).toContain(NodeOwnership.Enemy);
    });
  });

  describe('NodeControlState', () => {
    it('should validate node control state', () => {
      const validState: NodeControlState = {
        ownership: NodeOwnership.Neutral,
        userDamage: 100,
        enemyDamage: 50,
        captureThreshold: 1000
      };
      expect(validState).toBeDefined();
      expect(Object.values(NodeOwnership)).toContain(validState.ownership);
      expect(typeof validState.userDamage).toBe('number');
      expect(typeof validState.enemyDamage).toBe('number');
      expect(typeof validState.captureThreshold).toBe('number');
    });
  });

  describe('NodeInfo', () => {
    it('should validate node information', () => {
      const validInfo: NodeInfo = {
        position: { x: 100, y: 200 },
        ownership: NodeOwnership.User
      };
      expect(validInfo).toBeDefined();
      expect(validInfo.position).toBeDefined();
      expect(Object.values(NodeOwnership)).toContain(validInfo.ownership);
    });

    it('should handle optional control state', () => {
      const infoWithControl: NodeInfo = {
        position: { x: 100, y: 200 },
        ownership: NodeOwnership.User,
        controlState: {
          ownership: NodeOwnership.User,
          userDamage: 100,
          enemyDamage: 0,
          captureThreshold: 1000
        }
      };
      expect(infoWithControl.controlState).toBeDefined();
    });
  });
}); 