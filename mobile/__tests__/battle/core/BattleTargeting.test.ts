// Implementation of @battle-targeting-system.mdc#Target-Selection-Rules
import { BattalionType, Position, TargetInfo } from '../../../src/battle/core/types';
import { calculateTargetingPriority, calculateAttackPosition } from '../../../src/battle/core/BattleCalculations';

describe('Battle Targeting System', () => {
  describe('Universal Targeting Priority', () => {
    it('should always select nearest target regardless of type', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: 10, y: 0 }, id: 'test-1' },  // Distance: 10
        { type: BattalionType.Phreak, position: { x: 5, y: 0 }, id: 'test-2' },     // Distance: 5
        { type: BattalionType.Breacher, position: { x: 15, y: 0 }, id: 'test-3' }   // Distance: 15
      ];

      const result = calculateTargetingPriority({ attackerPosition, targets });
      expect(result.selectedTarget).toEqual(targets[1]); // Should select Phreak (closest)
    });

    it('should handle single target case', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: 10, y: 0 }, id: 'test-1' }
      ];

      const result = calculateTargetingPriority({ attackerPosition, targets });
      expect(result.selectedTarget).toEqual(targets[0]);
    });

    it('should throw error when no targets available', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [];

      expect(() => calculateTargetingPriority({ attackerPosition, targets }))
        .toThrow('No targets available');
    });

    it('should handle targets at same distance', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: 10, y: 0 }, id: 'test-1' },
        { type: BattalionType.Phreak, position: { x: 10, y: 0 }, id: 'test-2' }
      ];

      const result = calculateTargetingPriority({ attackerPosition, targets });
      // Should select first target when distances are equal
      expect(result.selectedTarget).toEqual(targets[0]);
    });

    it('should throw error for invalid positions', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: NaN, y: 0 }, id: 'test-1' }
      ];

      expect(() => calculateTargetingPriority({ attackerPosition, targets }))
        .toThrow('Invalid position coordinates');
    });

    it('should throw error for invalid battalion type', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: 'InvalidType' as BattalionType, position: { x: 10, y: 0 }, id: 'test-1' }
      ];

      expect(() => calculateTargetingPriority({ attackerPosition, targets }))
        .toThrow('Invalid battalion type');
    });
  });

  describe('Attack Position Calculations', () => {
    it('should maintain current position if already in range', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targetPosition: Position = { x: 3, y: 0 }; // Within Guardian range (4)
      
      const result = calculateAttackPosition({
        attackerType: BattalionType.Guardian,
        attackerPosition,
        targetPosition
      });

      expect(result).toEqual(attackerPosition);
    });

    it('should move to edge of range when target is too far', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targetPosition: Position = { x: 10, y: 0 }; // Beyond Guardian range (4)
      
      const result = calculateAttackPosition({
        attackerType: BattalionType.Guardian,
        attackerPosition,
        targetPosition
      });

      // Should move to position 6 units away from target (at range 4)
      expect(result.x).toBe(6);
      expect(result.y).toBe(0);
    });

    it('should handle diagonal movement correctly', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targetPosition: Position = { x: 10, y: 10 }; // Diagonal beyond range
      
      const result = calculateAttackPosition({
        attackerType: BattalionType.Phreak,
        attackerPosition,
        targetPosition
      });

      // Should maintain relative position on diagonal
      const distance = Math.sqrt(
        Math.pow(result.x - targetPosition.x, 2) + 
        Math.pow(result.y - targetPosition.y, 2)
      );
      expect(distance).toBeLessThanOrEqual(9); // Phreak range is 9
    });

    it('should round coordinates to integers', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targetPosition: Position = { x: 7, y: 7 };
      
      const result = calculateAttackPosition({
        attackerType: BattalionType.Breacher,
        attackerPosition,
        targetPosition
      });

      expect(Number.isInteger(result.x)).toBe(true);
      expect(Number.isInteger(result.y)).toBe(true);
    });

    it('should handle edge cases', () => {
      // Test maximum coordinate values
      const attackerPosition: Position = { x: 0, y: 0 };
      const targetPosition: Position = { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER };
      
      const result = calculateAttackPosition({
        attackerType: BattalionType.Guardian,
        attackerPosition,
        targetPosition
      });

      expect(Number.isFinite(result.x)).toBe(true);
      expect(Number.isFinite(result.y)).toBe(true);
    });

    it('should throw error for invalid inputs', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targetPosition: Position = { x: 10, y: 10 };

      // Invalid battalion type
      expect(() => calculateAttackPosition({
        attackerType: 'InvalidType' as BattalionType,
        attackerPosition,
        targetPosition
      })).toThrow('Invalid battalion type');

      // Invalid positions
      expect(() => calculateAttackPosition({
        attackerType: BattalionType.Guardian,
        attackerPosition: { x: NaN, y: 0 },
        targetPosition
      })).toThrow('Invalid position coordinates');

      expect(() => calculateAttackPosition({
        attackerType: BattalionType.Guardian,
        attackerPosition,
        targetPosition: { x: 10, y: NaN }
      })).toThrow('Invalid position coordinates');
    });
  });

  describe('Range-Based Targeting', () => {
    it('should validate target is within battalion range', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: 3, y: 0 }, id: 'test-1' }  // Within Guardian range (4)
      ];

      const result = calculateTargetingPriority({ attackerPosition, targets });
      expect(result.selectedTarget).toBeDefined();
      
      // Calculate if target is in range
      const distance = Math.sqrt(
        Math.pow(result.selectedTarget.position.x - attackerPosition.x, 2) +
        Math.pow(result.selectedTarget.position.y - attackerPosition.y, 2)
      );
      
      // Should be within Guardian's range (4)
      expect(distance).toBeLessThanOrEqual(4);
    });

    it('should handle multiple targets within range', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: 3, y: 0 }, id: 'test-1' },  // Distance: 3
        { type: BattalionType.Phreak, position: { x: 2, y: 0 }, id: 'test-2' },    // Distance: 2
        { type: BattalionType.Breacher, position: { x: 4, y: 0 }, id: 'test-3' }   // Distance: 4
      ];

      const result = calculateTargetingPriority({ attackerPosition, targets });
      expect(result.selectedTarget).toEqual(targets[1]); // Should select closest (Phreak)
    });
  });

  describe('Retargeting Behavior', () => {
    it('should maintain current target if still valid', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const currentTarget: TargetInfo = { 
        type: BattalionType.Guardian, 
        position: { x: 3, y: 0 },
        id: 'test-1'
      };
      const targets: TargetInfo[] = [
        currentTarget,
        { type: BattalionType.Phreak, position: { x: 2, y: 0 }, id: 'test-2' }  // Closer but should stick with current
      ];

      const result = calculateTargetingPriority({ 
        attackerPosition, 
        targets,
        currentTargetId: 'test-1'
      });
      expect(result.selectedTarget).toEqual(currentTarget);
    });

    it('should select new target when current target becomes invalid', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Phreak, position: { x: 2, y: 0 }, id: 'test-1' }
      ];

      const result = calculateTargetingPriority({ 
        attackerPosition, 
        targets,
        currentTargetId: 'invalid-id'
      });
      expect(result.selectedTarget).toEqual(targets[0]);
    });
  });

  describe('Performance Requirements', () => {
    it('should handle large number of targets efficiently', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [];
      
      // Generate 1000 targets
      for (let i = 0; i < 1000; i++) {
        targets.push({
          type: BattalionType.Guardian,
          position: { x: Math.random() * 100, y: Math.random() * 100 },
          id: `test-${i}`
        });
      }

      const startTime = performance.now();
      const result = calculateTargetingPriority({ attackerPosition, targets });
      const endTime = performance.now();
      
      expect(result.selectedTarget).toBeDefined();
      expect(endTime - startTime).toBeLessThan(16); // Should complete within one frame (16ms)
    });

    it('should handle rapid retargeting', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: 3, y: 0 }, id: 'test-1' }
      ];

      // Simulate rapid retargeting (60fps)
      const iterations = 60;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const result = calculateTargetingPriority({ attackerPosition, targets });
        expect(result.selectedTarget).toBeDefined();
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;
      
      expect(averageTime).toBeLessThan(1); // Average time should be under 1ms
    });
  });
}); 