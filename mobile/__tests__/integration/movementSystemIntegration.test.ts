import { 
  calculateMovementDistance, 
  executeBattalionMovement, 
  handlePostMovementActions,
  handleMovementValidation,
  handleMovementDecision,
  handleMovementExecution
} from '../../src/hooks/useMovement';
import { validateAndRetarget } from '../../src/utils/targetValidation';
import { setupAttackIfInRange } from '../../src/utils/attackSetup';
import { continuePathIfNeeded } from '../../src/utils/pathFollowing';
import { executeMovementWithCleanup } from '../../src/utils/movementWrapper';

// Mock React Native Animated
jest.mock('react-native', () => ({
  Animated: {
    timing: jest.fn(() => ({
      start: jest.fn()
    })),
    ValueXY: jest.fn(() => ({
      x: { _value: 0 },
      y: { _value: 0 }
    }))
  }
}));

// Mock dependencies
jest.mock('../../src/utils/battleConstants', () => ({
  BOT_CATEGORIES: {
    'breacher': {
      stats: {
        health: 18,
        speed: 5,
        range: 5,
        offense: 7,
        defense: 8
      }
    },
    'guardian': {
      stats: {
        health: 14,
        speed: 9,
        range: 4,
        offense: 8,
        defense: 6
      }
    }
  },
  RANGE_MULTIPLIER: 15
}));

jest.mock('../../src/utils/movementWrapper', () => ({
  executeMovementWithCleanup: jest.fn()
}));

jest.mock('../../src/utils/targetValidation', () => ({
  validateAndRetarget: jest.fn(),
  isInRange: jest.fn()
}));

jest.mock('../../src/utils/attackSetup', () => ({
  setupAttackIfInRange: jest.fn()
}));

jest.mock('../../src/utils/pathFollowing', () => ({
  continuePathIfNeeded: jest.fn()
}));

jest.mock('../../src/utils/nodeOwnership', () => ({
  isNeutral: jest.fn(() => true)
}));

describe('Movement System Integration', () => {
  let mockBattalion: any;
  let mockTarget: any;
  let mockNodes: any[];
  let mockAttackIntervals: any;
  let mockCleanupBattalion: jest.Mock;
  let mockSetupAttacks: jest.Mock;
  let mockFindAvailableTargets: jest.Mock;
  let mockMoveBattalionAlongPath: jest.Mock;
  let mockDebugLog: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBattalion = {
      position: { x: 0, y: 0 },
      type: 'breacher',
      quantity: 10,
      currentHealth: 180,
      targetNode: 0,
      remainingPath: [1, 2],
      finalTarget: 2,
      nodeIndex: 0
    };
    
    mockTarget = {
      type: 'node',
      index: 1,
      position: { x: 100, y: 100 }
    };
    
    mockNodes = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 200 }
    ];
    
    mockAttackIntervals = {};
    mockCleanupBattalion = jest.fn();
    mockSetupAttacks = jest.fn();
    mockFindAvailableTargets = jest.fn(() => [mockTarget]);
    mockMoveBattalionAlongPath = jest.fn();
    mockDebugLog = jest.fn();
  });

  describe('Complete Movement Flow Integration', () => {
    it('should handle complete movement flow from validation to execution', () => {
      // Mock successful validation
      (validateAndRetarget as jest.Mock).mockReturnValue({
        isValid: true,
        shouldRetarget: false
      });

      // Mock movement decision
      const movementDecision = {
        shouldAttack: false,
        moveDistance: 50,
        directionX: 0.707,
        directionY: 0.707,
        updatedDistance: 141.4,
        rangePosition: { x: 35.35, y: 35.35 }
      };

      // Mock path continuation
      (continuePathIfNeeded as jest.Mock).mockReturnValue({
        pathContinued: false
      });

      // Mock movement wrapper
      (executeMovementWithCleanup as jest.Mock).mockResolvedValue(undefined);

      // Execute the complete flow
      handlePostMovementActions(
        mockBattalion,
        mockTarget,
        mockNodes,
        { x: 0, y: 0 },
        75, // range
        true, // isUser
        'test-battalion',
        mockFindAvailableTargets,
        mockMoveBattalionAlongPath,
        mockSetupAttacks,
        mockDebugLog,
        [], // userBattalions
        [], // enemyBattalions
        mockAttackIntervals,
        mockCleanupBattalion
      );

      // Verify all utilities were called in the correct order
      expect(validateAndRetarget).toHaveBeenCalledWith(
        mockBattalion,
        mockTarget,
        mockNodes,
        { x: 0, y: 0 },
        75,
        true,
        [],
        [],
        mockFindAvailableTargets,
        mockMoveBattalionAlongPath,
        mockCleanupBattalion,
        'test-battalion',
        mockAttackIntervals
      );

      expect(continuePathIfNeeded).toHaveBeenCalledWith(
        mockBattalion,
        mockTarget,
        mockNodes,
        mockMoveBattalionAlongPath,
        true,
        [],
        [],
        mockDebugLog,
        'test-battalion'
      );

      expect(setupAttackIfInRange).toHaveBeenCalledWith(
        mockBattalion,
        mockTarget,
        { x: 0, y: 0 },
        75,
        true,
        [],
        [],
        mockSetupAttacks,
        mockMoveBattalionAlongPath,
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        undefined, // nodeRefs
        mockNodes,
        mockFindAvailableTargets,
        undefined, // setUserBattalions
        undefined  // setEnemyBattalions
      );
    });

    it('should handle retargeting when validation fails', () => {
      // Mock failed validation with retargeting
      (validateAndRetarget as jest.Mock).mockReturnValue({
        isValid: false,
        shouldRetarget: true
      });

      handlePostMovementActions(
        mockBattalion,
        mockTarget,
        mockNodes,
        { x: 0, y: 0 },
        75,
        true,
        'test-battalion',
        mockFindAvailableTargets,
        mockMoveBattalionAlongPath,
        mockSetupAttacks,
        mockDebugLog,
        [],
        [],
        mockAttackIntervals,
        mockCleanupBattalion
      );

      // Should not proceed with path continuation or attack setup
      expect(continuePathIfNeeded).not.toHaveBeenCalled();
      expect(setupAttackIfInRange).not.toHaveBeenCalled();
    });

    it('should handle path continuation when needed', () => {
      // Mock successful validation
      (validateAndRetarget as jest.Mock).mockReturnValue({
        isValid: true,
        shouldRetarget: false
      });

      // Mock path continuation
      (continuePathIfNeeded as jest.Mock).mockReturnValue({
        pathContinued: true
      });

      handlePostMovementActions(
        mockBattalion,
        mockTarget,
        mockNodes,
        { x: 0, y: 0 },
        75,
        true,
        'test-battalion',
        mockFindAvailableTargets,
        mockMoveBattalionAlongPath,
        mockSetupAttacks,
        mockDebugLog,
        [],
        [],
        mockAttackIntervals,
        mockCleanupBattalion
      );

      // Should not proceed with attack setup when path was continued
      expect(setupAttackIfInRange).not.toHaveBeenCalled();
    });
  });

  describe('Movement Distance Calculation Integration', () => {
    it('should calculate movement distance correctly for node targets', () => {
      const result = calculateMovementDistance(
        { x: 0, y: 0 },
        { type: 'node', index: 1, position: { x: 100, y: 100 } },
        75, // range
        true,
        [],
        []
      );

      expect(result.moveDistance).toBeGreaterThan(0);
      expect(result.directionX).toBeCloseTo(0.707, 2);
      expect(result.directionY).toBeCloseTo(0.707, 2);
      expect(result.rangePosition.x).toBeGreaterThan(0);
      expect(result.rangePosition.y).toBeGreaterThan(0);
    });

    it('should calculate movement distance correctly for battalion targets', () => {
      const enemyBattalions = [{
        type: 'guardian',
        position: { x: 100, y: 100 }
      }];

      const result = calculateMovementDistance(
        { x: 0, y: 0 },
        { type: 'battalion', index: 0, position: { x: 100, y: 100 } },
        75, // range
        true,
        [],
        enemyBattalions
      );

      expect(result.moveDistance).toBeGreaterThan(0);
      expect(result.directionX).toBeCloseTo(0.707, 2);
      expect(result.directionY).toBeCloseTo(0.707, 2);
    });
  });

  describe('Movement Execution Integration', () => {
    it('should execute movement with proper cleanup and monitoring', () => {
      // Mock movement wrapper
      (executeMovementWithCleanup as jest.Mock).mockResolvedValue(undefined);

      executeBattalionMovement(
        mockBattalion,
        { x: 50, y: 50 },
        50,
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        jest.fn(), // onMovementComplete
        mockTarget,
        true, // isUser
        [], // userBattalions
        [], // enemyBattalions
        mockFindAvailableTargets,
        mockMoveBattalionAlongPath
      );

      expect(executeMovementWithCleanup).toHaveBeenCalledWith(
        mockBattalion,
        { x: 50, y: 50 },
        50,
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        expect.any(Function), // onMovementComplete
        mockTarget,
        true,
        [],
        [],
        mockFindAvailableTargets,
        mockMoveBattalionAlongPath
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle movement wrapper errors gracefully', async () => {
      // Mock movement wrapper to throw error
      (executeMovementWithCleanup as jest.Mock).mockRejectedValue(
        new Error('Movement was interrupted')
      );

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      executeBattalionMovement(
        mockBattalion,
        { x: 50, y: 50 },
        50,
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        jest.fn(),
        mockTarget,
        true,
        [],
        [],
        mockFindAvailableTargets,
        mockMoveBattalionAlongPath
      );

      // Wait for the async error handling
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should NOT log the error anymore
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Integration', () => {
    it('should not have performance regressions in movement calculations', () => {
      const startTime = performance.now();
      
      // Run multiple movement calculations
      for (let i = 0; i < 100; i++) {
        calculateMovementDistance(
          { x: i, y: i },
          { type: 'node', index: 1, position: { x: 100 + i, y: 100 + i } },
          75,
          true,
          [],
          []
        );
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(100); // 100ms for 100 calculations
    });
  });
}); 