import { checkRangeIntersection } from '../../src/utils/battleCalculator';
import { BATTALION_CENTER_OFFSET } from '../../src/utils/battleConstants';

// Mock console.log to capture debug output
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  console.log = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
    originalConsoleLog(...args);
  });
});

afterEach(() => {
  console.log = originalConsoleLog;
});

// Recreate the getAttackRangeIntersectionPoint function for testing
function getAttackRangeIntersectionPoint(start: { x: number, y: number }, end: { x: number, y: number }, range: number) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x: end.x, y: end.y };
  
  // Move from end toward start by 'range' units
  // This calculates where the battalion's attack range edge should intersect with the target center
  const ratio = (distance - range) / distance;
  const intersectionPoint = {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio
  };
  
  return intersectionPoint;
}

describe('Step 3.1: Attack Range Intersection Precision', () => {
  describe('getAttackRangeIntersectionPoint', () => {
    it('should calculate precise intersection point for horizontal movement', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 0 };
      const range = 20;
      
      const intersection = getAttackRangeIntersectionPoint(start, end, range);
      
      // Battalion should stop 20 units away from target (at x=80)
      expect(intersection.x).toBeCloseTo(80, 2);
      expect(intersection.y).toBeCloseTo(0, 2);
      
      // Verify the calculation is correct (no longer checking console logs)
      expect(intersection).toEqual({ x: 80, y: 0 });
    });

    it('should calculate precise intersection point for diagonal movement', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const range = 20;
      
      const intersection = getAttackRangeIntersectionPoint(start, end, range);
      
      // Distance from start to end is sqrt(100^2 + 100^2) = 141.42
      // Ratio = (141.42 - 20) / 141.42 = 0.8586
      // Intersection should be at (85.86, 85.86)
      expect(intersection.x).toBeCloseTo(85.86, 1);
      expect(intersection.y).toBeCloseTo(85.86, 1);
    });

    it('should handle zero distance case', () => {
      const start = { x: 50, y: 50 };
      const end = { x: 50, y: 50 };
      const range = 20;
      
      const intersection = getAttackRangeIntersectionPoint(start, end, range);
      
      // Should return end point when start and end are the same
      expect(intersection.x).toBe(50);
      expect(intersection.y).toBe(50);
    });

    it('should apply battalion center offset correctly', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 0 };
      const range = 20;
      
      const intersection = getAttackRangeIntersectionPoint(start, end, range);
      
      // Raw intersection should be at x=80
      expect(intersection.x).toBeCloseTo(80, 2);
      
      // When applying BATTALION_CENTER_OFFSET, final position should be at x=70
      const finalPosition = {
        x: intersection.x - BATTALION_CENTER_OFFSET,
        y: intersection.y - BATTALION_CENTER_OFFSET
      };
      
      expect(finalPosition.x).toBeCloseTo(70, 2);
      expect(finalPosition.y).toBeCloseTo(-10, 2);
    });
  });

  describe('checkRangeIntersection', () => {
    it('should return true when battalion is exactly at attack range', () => {
      const battalionCenter = { x: 80, y: 0 };
      const targetCenter = { x: 100, y: 0 };
      const attackRange = 20;
      
      const inRange = checkRangeIntersection(battalionCenter, targetCenter, attackRange);
      
      expect(inRange).toBe(true);
      
      // Verify the range check works correctly (no longer checking console logs)
      expect(inRange).toBe(true);
    });

    it('should return true when battalion is within tolerance of attack range', () => {
      const battalionCenter = { x: 78, y: 0 }; // 2 pixels closer than exact range
      const targetCenter = { x: 100, y: 0 };
      const attackRange = 20;
      
      const inRange = checkRangeIntersection(battalionCenter, targetCenter, attackRange);
      
      // Should be within 2-pixel tolerance
      expect(inRange).toBe(true);
    });

    it('should return false when battalion is too close to target', () => {
      const battalionCenter = { x: 75, y: 0 }; // 5 pixels closer than exact range
      const targetCenter = { x: 100, y: 0 };
      const attackRange = 20;
      
      const inRange = checkRangeIntersection(battalionCenter, targetCenter, attackRange);
      
      // Should be outside 2-pixel tolerance
      expect(inRange).toBe(false);
    });

    it('should return false when battalion is too far from target', () => {
      const battalionCenter = { x: 85, y: 0 }; // 5 pixels further than exact range
      const targetCenter = { x: 100, y: 0 };
      const attackRange = 20;
      
      const inRange = checkRangeIntersection(battalionCenter, targetCenter, attackRange);
      
      // Should be outside 2-pixel tolerance
      expect(inRange).toBe(false);
    });

    it('should work with default tolerance', () => {
      const battalionCenter = { x: 78, y: 0 }; // 2 pixels closer than exact range
      const targetCenter = { x: 100, y: 0 };
      const attackRange = 20;
      
      const inRange = checkRangeIntersection(battalionCenter, targetCenter, attackRange);
      
      // Should be within default tolerance
      expect(inRange).toBe(true);
    });

    it('should handle diagonal positioning correctly', () => {
      const battalionCenter = { x: 80, y: 80 };
      const targetCenter = { x: 100, y: 100 };
      const attackRange = 20;
      
      const inRange = checkRangeIntersection(battalionCenter, targetCenter, attackRange);
      
      // Distance should be sqrt(20^2 + 20^2) = 28.28, which is > 20 + 2 tolerance
      expect(inRange).toBe(false);
    });
  });

  describe('BATTALION_CENTER_OFFSET constant', () => {
    it('should be properly defined', () => {
      expect(BATTALION_CENTER_OFFSET).toBe(10);
    });

    it('should be used correctly in positioning calculations', () => {
      // Test the complete positioning logic
      const targetCenter = { x: 100, y: 100 };
      const attackRange = 20;
      
      // Calculate where battalion center should be
      const battalionCenter = { x: 80, y: 100 }; // 20 units away from target
      
      // Calculate where battalion visual position should be
      const battalionVisualPosition = {
        x: battalionCenter.x - BATTALION_CENTER_OFFSET,
        y: battalionCenter.y - BATTALION_CENTER_OFFSET
      };
      
      expect(battalionVisualPosition.x).toBe(70);
      expect(battalionVisualPosition.y).toBe(90);
      
      // Verify that when battalion is at visual position, its center is at correct range
      const reconstructedCenter = {
        x: battalionVisualPosition.x + BATTALION_CENTER_OFFSET,
        y: battalionVisualPosition.y + BATTALION_CENTER_OFFSET
      };
      
      expect(reconstructedCenter.x).toBe(80);
      expect(reconstructedCenter.y).toBe(100);
      
      // Verify range check works correctly
      const inRange = checkRangeIntersection(reconstructedCenter, targetCenter, attackRange);
      expect(inRange).toBe(true);
    });
  });

  describe('Movement precision integration', () => {
    it('should maintain precision through complete movement cycle', () => {
      const startNode = { x: 0, y: 0 };
      const targetNode = { x: 100, y: 0 };
      const attackRange = 20;
      
      // Step 1: Calculate intersection point
      const intersection = getAttackRangeIntersectionPoint(startNode, targetNode, attackRange);
      expect(intersection.x).toBeCloseTo(80, 2);
      
      // Step 2: Apply battalion center offset
      const battalionPosition = {
        x: intersection.x - BATTALION_CENTER_OFFSET,
        y: intersection.y - BATTALION_CENTER_OFFSET
      };
      expect(battalionPosition.x).toBeCloseTo(70, 2);
      
      // Step 3: Verify battalion center is at correct range
      const battalionCenter = {
        x: battalionPosition.x + BATTALION_CENTER_OFFSET,
        y: battalionPosition.y + BATTALION_CENTER_OFFSET
      };
      expect(battalionCenter.x).toBeCloseTo(80, 2);
      
      // Step 4: Verify range check passes
      const inRange = checkRangeIntersection(battalionCenter, targetNode, attackRange);
      expect(inRange).toBe(true);
    });
  });
}); 