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

// Recreate the functions for testing to avoid React Native dependencies
function getAttackRangeIntersectionPoint(start: { x: number, y: number }, end: { x: number, y: number }, range: number) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x: end.x, y: end.y };
  
  const ratio = (distance - range) / distance;
  const intersectionPoint = {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio
  };
  
  return intersectionPoint;
}

// Mock BOT_CATEGORIES for testing
const BOT_CATEGORIES = {
  breacher: { stats: { range: 20 } },
  guardian: { stats: { range: 25 } },
  phreak: { stats: { range: 22 } }
};

const RANGE_MULTIPLIER = 1.5;

interface MovingTargetTracker {
  targetBattalion: any;
  lastPosition: { x: number, y: number };
  isUser: boolean;
  userBattalions: any[];
  enemyBattalions: any[];
  updateTargetPosition: () => { hasChanged: boolean; newPos: { x: number, y: number } };
  recalculateIntersection: (attackerPos: { x: number, y: number }, attackRange: number) => { x: number, y: number };
  validateAttackerPosition: (attackerPos: { x: number, y: number }, targetPos: { x: number, y: number }, attackRange: number) => { isValid: boolean; reason?: string };
}

function createMovingTargetTracker(
  targetBattalion: any,
  isUser: boolean,
  userBattalions: any[],
  enemyBattalions: any[]
): MovingTargetTracker {
  const lastPosition = { x: targetBattalion.position.x._value || 0, y: targetBattalion.position.y._value || 0 };
  
  return {
    targetBattalion,
    lastPosition,
    isUser,
    userBattalions,
    enemyBattalions,
    
    updateTargetPosition: () => {
      const currentPos = { 
        x: targetBattalion.position.x._value || 0, 
        y: targetBattalion.position.y._value || 0 
      };
      
      const hasChanged = currentPos.x !== lastPosition.x || currentPos.y !== lastPosition.y;
      
      if (hasChanged) {
        lastPosition.x = currentPos.x;
        lastPosition.y = currentPos.y;
      }
      
      return { hasChanged, newPos: currentPos };
    },
    
    recalculateIntersection: (attackerPos: { x: number, y: number }, attackRange: number) => {
      const currentTargetPos = { 
        x: targetBattalion.position.x._value || 0, 
        y: targetBattalion.position.y._value || 0 
      };
      
      return getAttackRangeIntersectionPoint(attackerPos, currentTargetPos, attackRange);
    },
    
    validateAttackerPosition: (attackerPos: { x: number, y: number }, targetPos: { x: number, y: number }, attackRange: number) => {
      const dx = attackerPos.x - targetPos.x;
      const dy = attackerPos.y - targetPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const tolerance = 5;
      const isValid = Math.abs(distance - attackRange) <= tolerance;
      
      return {
        isValid,
        reason: isValid ? undefined : `Distance ${distance.toFixed(1)} is outside attack range ${attackRange}`
      };
    }
  };
}

function handleMovingTargetUpdates(
  movingTargetTracker: MovingTargetTracker,
  attackerBattalion: any,
  currentAttackerPos: { x: number, y: number },
  onPathAdjustment: (newIntersection: { x: number, y: number }) => void
): boolean {
  const positionUpdate = movingTargetTracker.updateTargetPosition();
  
  if (positionUpdate.hasChanged) {
    const attackRange = BOT_CATEGORIES[attackerBattalion.type].stats.range * RANGE_MULTIPLIER;
    
    const newIntersection = movingTargetTracker.recalculateIntersection(currentAttackerPos, attackRange);
    
    const positionValidation = movingTargetTracker.validateAttackerPosition(
      currentAttackerPos, 
      positionUpdate.newPos, 
      attackRange
    );
    
    if (!positionValidation.isValid) {
      console.log('[Step 4.3 Moving Target] Target moved:', { 
        targetId: movingTargetTracker.targetBattalion.id || 'unknown',
        oldPos: movingTargetTracker.lastPosition, 
        newPos: positionUpdate.newPos, 
        intersectionPoint: newIntersection 
      });
      
      onPathAdjustment(newIntersection);
      return true;
    }
  }
  
  return false;
}

describe('Step 4.3: Moving Target Handling', () => {
  // Mock battalion with animated position
  const createMockBattalion = (x: number, y: number, type: string = 'breacher') => ({
    id: 'test-battalion',
    type,
    position: {
      x: { _value: x },
      y: { _value: y }
    }
  });

  // Mock target battalion that can move
  const createMockTargetBattalion = (x: number, y: number) => ({
    id: 'target-battalion',
    type: 'guardian',
    position: {
      x: { _value: x },
      y: { _value: y }
    }
  });

  describe('Core Moving Target Functionality', () => {
    it('should detect when target battalion moves and trigger path adjustment', () => {
      const targetBattalion = createMockTargetBattalion(100, 100);
      const tracker = createMovingTargetTracker(targetBattalion, true, [], []);
      const attackerBattalion = createMockBattalion(0, 0);
      const currentAttackerPos = { x: 0, y: 0 };
      
      let pathAdjustmentCalled = false;
      let newIntersection: { x: number, y: number } | null = null;

      // Move target to make current position invalid
      targetBattalion.position.x._value = 200;
      targetBattalion.position.y._value = 100;

      const result = handleMovingTargetUpdates(
        tracker,
        attackerBattalion,
        currentAttackerPos,
        (intersection) => { 
          pathAdjustmentCalled = true;
          newIntersection = intersection;
        }
      );

      expect(result).toBe(true);
      expect(pathAdjustmentCalled).toBe(true);
      expect(newIntersection).not.toBeNull();
      expect(consoleOutput.some(log => log.includes('[Step 4.3 Moving Target] Target moved:'))).toBe(true);
    });

    it('should not trigger path adjustment when target has not moved', () => {
      const targetBattalion = createMockTargetBattalion(100, 100);
      const tracker = createMovingTargetTracker(targetBattalion, true, [], []);
      const attackerBattalion = createMockBattalion(0, 0);
      const currentAttackerPos = { x: 0, y: 0 };
      
      let pathAdjustmentCalled = false;

      const result = handleMovingTargetUpdates(
        tracker,
        attackerBattalion,
        currentAttackerPos,
        () => { pathAdjustmentCalled = true; }
      );

      expect(result).toBe(false);
      expect(pathAdjustmentCalled).toBe(false);
    });

    it('should recalculate intersection point when target moves', () => {
      const targetBattalion = createMockTargetBattalion(100, 100);
      const tracker = createMovingTargetTracker(targetBattalion, true, [], []);
      const attackerBattalion = createMockBattalion(0, 0);
      const attackRange = BOT_CATEGORIES[attackerBattalion.type].stats.range * RANGE_MULTIPLIER;

      // Initial intersection
      const initialIntersection = tracker.recalculateIntersection({ x: 0, y: 0 }, attackRange);
      
      // Move target
      targetBattalion.position.x._value = 150;
      targetBattalion.position.y._value = 100;

      // New intersection
      const newIntersection = tracker.recalculateIntersection({ x: 0, y: 0 }, attackRange);

      // Intersections should be different
      expect(newIntersection.x).not.toBeCloseTo(initialIntersection.x, 1);
      expect(newIntersection.y).not.toBeCloseTo(initialIntersection.y, 1);
    });

    it('should validate attacker position correctly with tolerance', () => {
      const targetBattalion = createMockTargetBattalion(100, 0);
      const tracker = createMovingTargetTracker(targetBattalion, true, [], []);
      const attackRange = 50;

      // Valid position (exactly at range)
      const validPos = { x: 50, y: 0 };
      const validValidation = tracker.validateAttackerPosition(validPos, { x: 100, y: 0 }, attackRange);
      expect(validValidation.isValid).toBe(true);

      // Valid position (within tolerance)
      const tolerancePos = { x: 52, y: 0 }; // 2 pixels off, within 5-pixel tolerance
      const toleranceValidation = tracker.validateAttackerPosition(tolerancePos, { x: 100, y: 0 }, attackRange);
      expect(toleranceValidation.isValid).toBe(true);

      // Invalid position (outside tolerance)
      const invalidPos = { x: 60, y: 0 }; // 10 pixels off, outside 5-pixel tolerance
      const invalidValidation = tracker.validateAttackerPosition(invalidPos, { x: 100, y: 0 }, attackRange);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.reason).toContain('Distance');
    });
  });

  describe('Position Tracking', () => {
    it('should track target position changes correctly', () => {
      const targetBattalion = createMockTargetBattalion(100, 100);
      const tracker = createMovingTargetTracker(targetBattalion, true, [], []);

      // Initial position check
      const initialUpdate = tracker.updateTargetPosition();
      expect(initialUpdate.hasChanged).toBe(false);

      // Move target
      targetBattalion.position.x._value = 150;
      targetBattalion.position.y._value = 150;

      const movedUpdate = tracker.updateTargetPosition();
      expect(movedUpdate.hasChanged).toBe(true);
      expect(movedUpdate.newPos).toEqual({ x: 150, y: 150 });

      // Move again
      targetBattalion.position.x._value = 200;
      targetBattalion.position.y._value = 200;

      const secondMoveUpdate = tracker.updateTargetPosition();
      expect(secondMoveUpdate.hasChanged).toBe(true);
      expect(secondMoveUpdate.newPos).toEqual({ x: 200, y: 200 });
    });

    it('should not detect change when position is the same', () => {
      const targetBattalion = createMockTargetBattalion(100, 100);
      const tracker = createMovingTargetTracker(targetBattalion, true, [], []);

      // Initial position
      tracker.updateTargetPosition();

      // Set same position
      targetBattalion.position.x._value = 100;
      targetBattalion.position.y._value = 100;

      const update = tracker.updateTargetPosition();
      expect(update.hasChanged).toBe(false);
    });
  });
}); 