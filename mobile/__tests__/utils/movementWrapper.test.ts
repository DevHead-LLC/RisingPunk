import { executeMovementWithCleanup } from '../../src/utils/movementWrapper';

// Mock React Native Animated
jest.mock('react-native', () => ({
  Animated: {
    timing: jest.fn(() => ({
      start: jest.fn()
    }))
  }
}));

// Mock dependencies
jest.mock('../../src/utils/battleConstants', () => ({
  BOT_CATEGORIES: {
    'test-bot': {
      stats: {
        speed: 100
      }
    }
  }
}));

jest.mock('../../src/utils/battleUtils', () => ({
  calculateMovementDuration: jest.fn(() => 1000)
}));

jest.mock('../../src/utils/movementMonitoring', () => ({
  createMovementMonitoring: jest.fn(() => 'mock-interval'),
  clearMovementMonitoring: jest.fn()
}));

describe('movementWrapper', () => {
  let mockBattalion: any;
  let mockAttackIntervals: any;
  let mockCleanupBattalion: jest.Mock;
  let mockOnMovementComplete: jest.Mock;
  let mockAnimatedTiming: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBattalion = {
      position: { x: 0, y: 0 },
      type: 'test-bot',
      quantity: 10,
      currentHealth: 100
    };
    
    mockAttackIntervals = {};
    mockCleanupBattalion = jest.fn();
    mockOnMovementComplete = jest.fn();
    
    mockAnimatedTiming = {
      start: jest.fn()
    };
    
    const { Animated } = require('react-native');
    Animated.timing.mockReturnValue(mockAnimatedTiming);
  });

  describe('executeMovementWithCleanup', () => {
    it('should execute movement with proper cleanup and monitoring', async () => {
      const rangePosition = { x: 100, y: 100 };
      const moveDistance = 100;
      const battalionId = 'test-battalion';
      const target = { type: 'node', index: 0 };
      const isUser = true;
      const userBattalions = [];
      const enemyBattalions = [];
      const findAvailableTargets = jest.fn();
      const moveBattalionAlongPath = jest.fn();

      // Mock successful movement completion
      mockAnimatedTiming.start.mockImplementation((callback) => {
        callback({ finished: true });
      });

      const promise = executeMovementWithCleanup(
        mockBattalion,
        rangePosition,
        moveDistance,
        battalionId,
        mockAttackIntervals,
        mockCleanupBattalion,
        mockOnMovementComplete,
        target,
        isUser,
        userBattalions,
        enemyBattalions,
        findAvailableTargets,
        moveBattalionAlongPath
      );

      await promise;

      // Verify cleanup was called
      expect(mockCleanupBattalion).toHaveBeenCalledWith(battalionId, mockAttackIntervals);

      // Verify monitoring was set up
      const { createMovementMonitoring } = require('../../src/utils/movementMonitoring');
      expect(createMovementMonitoring).toHaveBeenCalledWith({
        battalionId,
        target,
        isUser,
        userBattalions,
        enemyBattalions,
        findAvailableTargets,
        moveBattalionAlongPath,
        battalion: mockBattalion
      });

      // Verify animation was started
      const { Animated } = require('react-native');
      expect(Animated.timing).toHaveBeenCalledWith(mockBattalion.position, {
        toValue: rangePosition,
        duration: 1000, // (moveDistance / 100) * baseDuration
        useNativeDriver: true
      });

      // Verify monitoring was cleared
      const { clearMovementMonitoring } = require('../../src/utils/movementMonitoring');
      expect(clearMovementMonitoring).toHaveBeenCalledWith('mock-interval');

      // Verify completion callback was called
      expect(mockOnMovementComplete).toHaveBeenCalled();
    });

    it('should handle movement interruption gracefully', async () => {
      // Mock interrupted movement
      mockAnimatedTiming.start.mockImplementation((callback) => {
        callback({ finished: false });
      });

      const promise = executeMovementWithCleanup(
        mockBattalion,
        { x: 100, y: 100 },
        100,
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        mockOnMovementComplete
      );

      // Should resolve even if movement doesn't finish (this is normal in battle)
      await promise;
      expect(mockOnMovementComplete).toHaveBeenCalled();
    });

    it('should handle battalion death during movement', async () => {
      // Mock successful movement but battalion dies
      mockAnimatedTiming.start.mockImplementation((callback) => {
        mockBattalion.quantity = 0; // Battalion dies
        callback({ finished: true });
      });

      const promise = executeMovementWithCleanup(
        mockBattalion,
        { x: 100, y: 100 },
        100,
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        mockOnMovementComplete
      );

      await expect(promise).rejects.toThrow('Battalion died during movement');
      expect(mockCleanupBattalion).toHaveBeenCalledWith('test-battalion', mockAttackIntervals);
      expect(mockOnMovementComplete).not.toHaveBeenCalled();
    });

    it('should handle battalion with zero health during movement', async () => {
      // Mock successful movement but battalion has zero health
      mockAnimatedTiming.start.mockImplementation((callback) => {
        mockBattalion.currentHealth = 0; // Battalion has zero health
        callback({ finished: true });
      });

      const promise = executeMovementWithCleanup(
        mockBattalion,
        { x: 100, y: 100 },
        100,
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        mockOnMovementComplete
      );

      await expect(promise).rejects.toThrow('Battalion died during movement');
      expect(mockCleanupBattalion).toHaveBeenCalledWith('test-battalion', mockAttackIntervals);
      expect(mockOnMovementComplete).not.toHaveBeenCalled();
    });

    it('should work without monitoring when target is not provided', async () => {
      // Mock successful movement completion
      mockAnimatedTiming.start.mockImplementation((callback) => {
        callback({ finished: true });
      });

      const promise = executeMovementWithCleanup(
        mockBattalion,
        { x: 100, y: 100 },
        100,
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        mockOnMovementComplete
        // No target provided
      );

      await promise;

      // Verify monitoring was not set up
      const { createMovementMonitoring } = require('../../src/utils/movementMonitoring');
      expect(createMovementMonitoring).not.toHaveBeenCalled();

      // Verify completion callback was called
      expect(mockOnMovementComplete).toHaveBeenCalled();
    });

    it('should calculate movement duration correctly', async () => {
      // Mock successful movement completion
      mockAnimatedTiming.start.mockImplementation((callback) => {
        callback({ finished: true });
      });

      const promise = executeMovementWithCleanup(
        mockBattalion,
        { x: 100, y: 100 },
        200, // Different distance
        'test-battalion',
        mockAttackIntervals,
        mockCleanupBattalion,
        mockOnMovementComplete
      );

      await promise;

      // Verify duration calculation
      const { Animated } = require('react-native');
      expect(Animated.timing).toHaveBeenCalledWith(mockBattalion.position, {
        toValue: { x: 100, y: 100 },
        duration: 2000, // (200 / 100) * 1000
        useNativeDriver: true
      });
    });
  });
}); 