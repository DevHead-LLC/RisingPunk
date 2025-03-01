// Implementation of @battle-targeting-system.mdc#Target-Selection-Rules
import { BattalionType, Position, TargetInfo } from '../../../src/battle/core/types';
import { calculateTargetingPriority } from '../../../src/battle/core/BattleCalculations';

describe('Battle Targeting System', () => {
  describe('Universal Targeting Priority', () => {
    it('should always select nearest target regardless of type', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: 10, y: 0 } },  // Distance: 10
        { type: BattalionType.Phreak, position: { x: 5, y: 0 } },     // Distance: 5
        { type: BattalionType.Breacher, position: { x: 15, y: 0 } }   // Distance: 15
      ];

      const result = calculateTargetingPriority({ attackerPosition, targets });
      expect(result.selectedTarget).toEqual(targets[1]); // Should select Phreak (closest)
    });

    it('should handle single target case', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: 10, y: 0 } }
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
        { type: BattalionType.Guardian, position: { x: 10, y: 0 } },
        { type: BattalionType.Phreak, position: { x: 10, y: 0 } }
      ];

      const result = calculateTargetingPriority({ attackerPosition, targets });
      // Should select first target when distances are equal
      expect(result.selectedTarget).toEqual(targets[0]);
    });

    it('should throw error for invalid positions', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: BattalionType.Guardian, position: { x: NaN, y: 0 } }
      ];

      expect(() => calculateTargetingPriority({ attackerPosition, targets }))
        .toThrow('Invalid position coordinates');
    });

    it('should throw error for invalid battalion type', () => {
      const attackerPosition: Position = { x: 0, y: 0 };
      const targets: TargetInfo[] = [
        { type: 'InvalidType' as BattalionType, position: { x: 10, y: 0 } }
      ];

      expect(() => calculateTargetingPriority({ attackerPosition, targets }))
        .toThrow('Invalid battalion type');
    });
  });
}); 