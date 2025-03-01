// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Universal-Targeting
// Tests core targeting rules and range calculations

import { BattalionType } from '../../../src/battle/core/types';
import { calculateTargetingPriority } from '../../../src/battle/core/BattleCalculations';

describe('Targeting System', () => {
  // Test basic proximity-based targeting
  // As per rules: "ONLY factor is proximity to target"
  it('should prioritize closest target', () => {
    const priority = calculateTargetingPriority({
      attackerPosition: { x: 0, y: 0 },
      targets: [
        { type: BattalionType.Guardian, position: { x: 10, y: 10 } },
        { type: BattalionType.Phreak, position: { x: 5, y: 5 } }
      ]
    });

    // Should select the closer Phreak target
    expect(priority.selectedTarget).toEqual({
      type: BattalionType.Phreak,
      position: { x: 5, y: 5 }
    });
  });

  // Error handling tests
  describe('Error Handling', () => {
    it('should throw error for empty targets array', () => {
      expect(() => {
        calculateTargetingPriority({
          attackerPosition: { x: 0, y: 0 },
          targets: []
        });
      }).toThrow('No targets available');
    });

    it('should throw error for invalid target type', () => {
      expect(() => {
        calculateTargetingPriority({
          attackerPosition: { x: 0, y: 0 },
          targets: [
            { type: 'InvalidType' as BattalionType, position: { x: 5, y: 5 } }
          ]
        });
      }).toThrow('Invalid battalion type');
    });

    it('should throw error for missing position coordinates', () => {
      expect(() => {
        calculateTargetingPriority({
          attackerPosition: { x: 0 } as any,
          targets: [
            { type: BattalionType.Guardian, position: { x: 5, y: 5 } }
          ]
        });
      }).toThrow('Invalid position coordinates');
    });
  });
}); 