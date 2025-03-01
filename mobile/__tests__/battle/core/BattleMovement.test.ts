// Implementation of @battle-movement-system.mdc#Core-Movement-Properties
// Tests core movement rules and speed calculations

import { BattalionType, Position } from '../../../src/battle/core/types';
import { calculateMovementSpeed, validateMovementPath, calculatePathDistance, calculateAttackPosition, validateInitialMovement } from '../../../src/battle/core/BattleCalculations';

describe('Movement System', () => {
  // Test basic movement speeds per battalion type
  describe('Movement Speed', () => {
    it('should return correct speed for Guardian', () => {
      const speed = calculateMovementSpeed(BattalionType.Guardian);
      expect(speed).toBe(9); // 9 units per second
    });

    it('should return correct speed for Phreak', () => {
      const speed = calculateMovementSpeed(BattalionType.Phreak);
      expect(speed).toBe(7); // 7 units per second
    });

    it('should return correct speed for Breacher', () => {
      const speed = calculateMovementSpeed(BattalionType.Breacher);
      expect(speed).toBe(5); // 5 units per second
    });

    it('should throw error for invalid battalion type', () => {
      expect(() => {
        calculateMovementSpeed('InvalidType' as BattalionType);
      }).toThrow('Invalid battalion type');
    });
  });

  // Test network movement constraints
  describe('Network Movement', () => {
    const nodePositions: Position[] = [
      { x: 0, y: 0 },   // Node 0
      { x: 10, y: 0 },  // Node 1
      { x: 20, y: 0 },  // Node 2
      { x: 0, y: 10 },  // Node 3
      { x: 10, y: 10 }, // Node 4
      { x: 20, y: 10 }  // Node 5
    ];

    it('should validate valid movement along network lines', () => {
      const path = [
        nodePositions[0], // Start at Node 0
        nodePositions[1], // Move to Node 1
        nodePositions[4]  // Turn at Node 1 to reach Node 4
      ];

      expect(() => {
        validateMovementPath(path);
      }).not.toThrow();
    });

    it('should reject diagonal movement between nodes', () => {
      const path = [
        nodePositions[0], // Start at Node 0
        nodePositions[4]  // Try to move diagonally to Node 4
      ];

      expect(() => {
        validateMovementPath(path);
      }).toThrow('Invalid movement: Must follow network lines');
    });

    it('should calculate correct path distance', () => {
      const path = [
        nodePositions[0], // Start at Node 0
        nodePositions[1], // Move to Node 1 (10 units)
        nodePositions[4]  // Move to Node 4 (10 units)
      ];

      const distance = calculatePathDistance(path);
      expect(distance).toBe(20); // Total distance: 10 + 10 = 20 units
    });

    it('should throw error for invalid path coordinates', () => {
      const invalidPath = [
        { x: 0, y: 0 },
        { x: 'invalid' as any, y: 0 }
      ];

      expect(() => {
        validateMovementPath(invalidPath);
      }).toThrow('Invalid position coordinates');
    });
  });

  // Test attack range positioning
  describe('Attack Range Positioning', () => {
    it('should calculate correct attack position for Guardian', () => {
      const attackerType = BattalionType.Guardian;
      const attackerPosition = { x: 0, y: 0 };
      const targetPosition = { x: 10, y: 0 };

      const attackPosition = calculateAttackPosition({
        attackerType,
        attackerPosition,
        targetPosition
      });

      // Guardian has range 4, so should stop 4 units away from target
      expect(attackPosition).toEqual({ x: 6, y: 0 });
    });

    it('should calculate correct attack position for Phreak', () => {
      const attackerType = BattalionType.Phreak;
      const attackerPosition = { x: 0, y: 0 };
      const targetPosition = { x: 0, y: 20 };

      const attackPosition = calculateAttackPosition({
        attackerType,
        attackerPosition,
        targetPosition
      });

      // Phreak has range 9, so should stop 9 units away from target
      expect(attackPosition).toEqual({ x: 0, y: 11 });
    });

    it('should return current position if already in range', () => {
      const attackerType = BattalionType.Breacher;
      const attackerPosition = { x: 10, y: 10 };
      const targetPosition = { x: 12, y: 10 };

      const attackPosition = calculateAttackPosition({
        attackerType,
        attackerPosition,
        targetPosition
      });

      // Breacher has range 5, target is 2 units away, so stay in place
      expect(attackPosition).toEqual(attackerPosition);
    });

    it('should throw error for invalid positions', () => {
      expect(() => {
        calculateAttackPosition({
          attackerType: BattalionType.Guardian,
          attackerPosition: { x: 'invalid' as any, y: 0 },
          targetPosition: { x: 10, y: 0 }
        });
      }).toThrow('Invalid position coordinates');
    });
  });

  // Test initial node movement restrictions
  describe('Initial Node Restrictions', () => {
    const nodePositions: Position[] = [
      { x: 0, y: 0 },   // Node 0 (user)
      { x: 10, y: 0 },  // Node 1 (user)
      { x: 20, y: 0 },  // Node 2 (user)
      { x: 0, y: 10 },  // Node 3 (neutral)
      { x: 10, y: 10 }, // Node 4 (neutral)
      { x: 20, y: 10 }, // Node 5 (neutral)
      { x: 0, y: 20 },  // Node 6 (enemy)
      { x: 10, y: 20 }, // Node 7 (enemy)
      { x: 20, y: 20 }  // Node 8 (enemy)
    ];

    it('should allow Node 0 battalions to target nodes 3 and 4', () => {
      expect(() => {
        validateInitialMovement(0, 3); // Node 0 -> Node 3
        validateInitialMovement(0, 4); // Node 0 -> Node 4
      }).not.toThrow();
    });

    it('should allow Node 1 battalions to target nodes 3, 4, and 5', () => {
      expect(() => {
        validateInitialMovement(1, 3); // Node 1 -> Node 3
        validateInitialMovement(1, 4); // Node 1 -> Node 4
        validateInitialMovement(1, 5); // Node 1 -> Node 5
      }).not.toThrow();
    });

    it('should allow Node 2 battalions to target nodes 4 and 5', () => {
      expect(() => {
        validateInitialMovement(2, 4); // Node 2 -> Node 4
        validateInitialMovement(2, 5); // Node 2 -> Node 5
      }).not.toThrow();
    });

    it('should reject invalid initial movements', () => {
      // Node 0 cannot target Node 5 (too far)
      expect(() => {
        validateInitialMovement(0, 5);
      }).toThrow('Invalid initial movement: Target node not accessible');

      // Node 2 cannot target Node 3 (too far)
      expect(() => {
        validateInitialMovement(2, 3);
      }).toThrow('Invalid initial movement: Target node not accessible');

      // Cannot target non-neutral nodes
      expect(() => {
        validateInitialMovement(1, 6); // Cannot target enemy node
      }).toThrow('Invalid initial movement: Can only target neutral nodes');

      expect(() => {
        validateInitialMovement(1, 1); // Cannot target own node
      }).toThrow('Invalid initial movement: Can only target neutral nodes');
    });

    it('should reject invalid node indices', () => {
      expect(() => {
        validateInitialMovement(-1, 3);
      }).toThrow('Invalid node index');

      expect(() => {
        validateInitialMovement(1, 9);
      }).toThrow('Invalid node index');
    });
  });
}); 