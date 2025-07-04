import { calculateMovementDistance, handleMovementDecision } from '../../src/utils/movementUtils';

describe('movementUtils', () => {
  describe('calculateMovementDistance', () => {
    it('should return zero movement if already in range', () => {
      const result = calculateMovementDistance(
        { x: 0, y: 0 },
        { type: 'node', index: 1, position: { x: 10, y: 0 } },
        20, // Range is 20, target is 10 away
        true
      );
      expect(result.moveDistance).toBe(0);
      expect(result.updatedDistance).toBe(10);
      expect(result.rangePosition.x).toBe(0);
      expect(result.rangePosition.y).toBe(0);
    });

    it('should calculate correct movement when out of range', () => {
      const result = calculateMovementDistance(
        { x: 0, y: 0 },
        { type: 'node', index: 1, position: { x: 100, y: 0 } },
        30, // Range is 30, target is 100 away
        true
      );
      expect(result.moveDistance).toBeCloseTo(70, 1);
      expect(result.updatedDistance).toBeCloseTo(100, 1);
      expect(result.rangePosition.x).toBeCloseTo(70, 1);
      expect(result.rangePosition.y).toBeCloseTo(0, 1);
    });
  });

  describe('handleMovementDecision', () => {
    it('should return shouldAttack: true if in range', () => {
      const result = handleMovementDecision(
        { x: 0, y: 0 },
        { type: 'node', index: 1, position: { x: 10, y: 0 } },
        20, // Range is 20, target is 10 away
        true
      );
      expect(result.shouldAttack).toBe(true);
      expect(result.moveDistance).toBe(0);
    });

    it('should return shouldAttack: false if out of range', () => {
      const result = handleMovementDecision(
        { x: 0, y: 0 },
        { type: 'node', index: 1, position: { x: 100, y: 0 } },
        30, // Range is 30, target is 100 away
        true
      );
      expect(result.shouldAttack).toBe(false);
      expect(result.moveDistance).toBeCloseTo(70, 1);
    });
  });
}); 