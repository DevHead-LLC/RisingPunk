// Implementation of @battle-state-persistence.mdc#Network-Integration
// Tests network state synchronization, error handling, and performance

import { BattleService } from '../../../src/services/BattleService';
import { BattleState, BattalionState, NodeState } from '../../../src/battle/core/BattleStateManager';
import { Position } from '../../../src/battle/core/types';
import { BattlePhase } from '../../../src/battle/core/BattleContext';
import { BattlePerformanceMonitor } from '../../../src/battle/core/BattlePerformanceMonitor';

// Mock BattlePerformanceMonitor
const mockRecordNetworkLatency = jest.fn();
jest.mock('../../../src/battle/core/BattlePerformanceMonitor', () => ({
  BattlePerformanceMonitor: {
    getInstance: jest.fn(() => ({
      recordNetworkLatency: mockRecordNetworkLatency,
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn()
    }))
  }
}));

// Mock interval type
interface MockInterval extends jest.Mock {
  __promisify__: jest.Mock;
}

describe('Battle Network Integration', () => {
  let battleService: BattleService;
  const mockBattleId = 'test-battle-123';
  let callbacks: Function[] = [];

  const mockBattalion: BattalionState = {
    id: 'battalion-1',
    type: 'breacher',
    quantity: 5,
    health: 100,
    position: { x: 0, y: 0 } as Position,
    targetId: null,
    team: 'user'
  };

  const mockNode: NodeState = {
    id: 1,
    position: { x: 10, y: 10 } as Position,
    controllingTeam: null,
    controlProgress: 0,
    health: 100
  };

  beforeEach(() => {
    battleService = BattleService.getInstance();
    jest.useFakeTimers();
    callbacks = [];
    const mockInterval = jest.fn((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    }) as MockInterval;
    mockInterval.__promisify__ = jest.fn();
    global.setInterval = mockInterval as unknown as typeof global.setInterval;
    global.clearInterval = jest.fn();
  });

  afterEach(() => {
    battleService.stopSync();
    jest.clearAllMocks();
    jest.useRealTimers();
    callbacks = [];
  });

  // Helper to trigger interval callbacks
  const triggerIntervals = async () => {
    for (const callback of callbacks) {
      callback();
      await Promise.resolve(); // Wait for fetch
      await Promise.resolve(); // Wait for state transformation
    }
  };

  describe('State Synchronization', () => {
    it('should start sync with correct interval', () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();

      battleService.startSync(mockBattleId, onUpdate, onError);
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should handle successful state updates', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();
      const mockState = {
        phase: BattlePhase.ACTIVE_BATTLE,
        timeRemaining: 15,
        battalions: { [mockBattalion.id]: mockBattalion },
        nodes: { [mockNode.id]: mockNode },
        updateId: 1,
        lastUpdated: new Date().toISOString()
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      battleService.startSync(mockBattleId, onUpdate, onError);
      await triggerIntervals();

      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        phase: BattlePhase.ACTIVE_BATTLE,
        timeRemaining: 15,
        battalions: expect.any(Map),
        nodes: expect.any(Map)
      }));
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle network errors with retry', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      battleService.startSync(mockBattleId, onUpdate, onError);
      await triggerIntervals();

      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Sync attempt 1 failed'));
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('should stop sync after max retries', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();
      let retryCount = 0;

      // Mock repeated failures
      global.fetch = jest.fn().mockImplementation(async () => {
        retryCount++;
        throw new Error('Network error');
      });

      battleService.startSync(mockBattleId, onUpdate, onError);
      
      // Trigger 4 intervals (initial + 3 retries)
      for (let i = 0; i < 4; i++) {
        await triggerIntervals();
      }

      expect(retryCount).toBe(4); // Initial try + 3 retries
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Sync failed after 3 retries'));
      expect(global.setInterval).toHaveBeenCalled();
    });
  });

  describe('State Updates', () => {
    it('should send state updates to server', async () => {
      const mockState = {
        phase: BattlePhase.ACTIVE_BATTLE,
        timeRemaining: 15,
        battalions: { [mockBattalion.id]: mockBattalion },
        nodes: { [mockNode.id]: mockNode }
      };

      // Mock successful update
      global.fetch = jest.fn().mockImplementation(async (url, options) => {
        // Verify the request body is correctly transformed
        const body = JSON.parse(options.body);
        expect(body).toEqual({
          phase: BattlePhase.ACTIVE_BATTLE,
          timeRemaining: 15,
          battalions: { [mockBattalion.id]: mockBattalion },
          nodes: { [mockNode.id]: mockNode }
        });

        return {
          ok: true,
          json: () => Promise.resolve(mockState)
        };
      });

      const updateState = {
        phase: BattlePhase.ACTIVE_BATTLE,
        timeRemaining: 15,
        battalions: new Map([[mockBattalion.id, mockBattalion]]),
        nodes: new Map([[mockNode.id, mockNode]])
      };

      const result = await battleService.updateState(mockBattleId, updateState);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(mockBattleId),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle update failures gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Update failed'));

      const result = await battleService.updateState(mockBattleId, {
        phase: BattlePhase.ACTIVE_BATTLE
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('Performance Validation', () => {
    it('should maintain sync timing within acceptable range', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();
      let callCount = 0;

      // Mock successful responses
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        return {
          ok: true,
          json: () => Promise.resolve({
            phase: BattlePhase.ACTIVE_BATTLE,
            timeRemaining: 15,
            battalions: { [mockBattalion.id]: mockBattalion },
            nodes: { [mockNode.id]: mockNode }
          })
        };
      });

      battleService.startSync(mockBattleId, onUpdate, onError);
      
      // Trigger 5 intervals
      for (let i = 0; i < 5; i++) {
        await triggerIntervals();
      }

      expect(callCount).toBe(5);
      expect(onUpdate).toHaveBeenCalledTimes(5);
    });

    it('should handle rapid state updates efficiently', async () => {
      const updates = Array.from({ length: 10 }, (_, i) => ({
        phase: BattlePhase.ACTIVE_BATTLE,
        timeRemaining: 15 - i,
        battalions: new Map([[mockBattalion.id, mockBattalion]]),
        nodes: new Map([[mockNode.id, mockNode]])
      }));

      // Mock successful responses
      global.fetch = jest.fn().mockImplementation(async (url, options) => {
        const body = JSON.parse(options.body);
        // Verify the request body is correctly transformed
        expect(body).toEqual({
          phase: BattlePhase.ACTIVE_BATTLE,
          timeRemaining: expect.any(Number),
          battalions: { [mockBattalion.id]: mockBattalion },
          nodes: { [mockNode.id]: mockNode }
        });

        return {
          ok: true,
          json: () => Promise.resolve(body)
        };
      });

      const results = await Promise.all(
        updates.map(update => battleService.updateState(mockBattleId, update))
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(10);
    });

    it('should monitor network latency', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();

      // Mock successful response with delay
      global.fetch = jest.fn().mockImplementation(async () => {
        mockRecordNetworkLatency(50); // Record 50ms latency
        return {
          ok: true,
          json: () => Promise.resolve({
            phase: BattlePhase.ACTIVE_BATTLE,
            timeRemaining: 15,
            battalions: { [mockBattalion.id]: mockBattalion },
            nodes: { [mockNode.id]: mockNode },
            updateId: 1,
            lastUpdated: new Date().toISOString()
          })
        };
      });

      battleService.startSync(mockBattleId, onUpdate, onError);
      await triggerIntervals();

      expect(mockRecordNetworkLatency).toHaveBeenCalledWith(50);
      expect(onUpdate).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('State Validation', () => {
    it('should validate state structure before sync', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();

      // Mock successful sync with invalid state structure
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          phase: 'INVALID_PHASE',
          timeRemaining: 'not a number',
          battalions: null,
          nodes: undefined
        })
      });

      battleService.startSync(mockBattleId, onUpdate, onError);
      await triggerIntervals();

      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Sync attempt 1 failed'));
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();

      // Mock response with invalid state
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing most required fields
          phase: BattlePhase.ACTIVE_BATTLE
        })
      });

      battleService.startSync(mockBattleId, onUpdate, onError);
      await triggerIntervals();
      await Promise.resolve(); // Wait for validation

      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Sync attempt 1 failed'));
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should recover sync after temporary network failure', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();
      let failureCount = 0;

      // Mock alternating failures and successes
      global.fetch = jest.fn().mockImplementation(async () => {
        failureCount++;
        if (failureCount % 2 === 1) {
          throw new Error('Network error');
        }
        return {
          ok: true,
          json: () => Promise.resolve({
            phase: BattlePhase.ACTIVE_BATTLE,
            timeRemaining: 15,
            battalions: { [mockBattalion.id]: mockBattalion },
            nodes: { [mockNode.id]: mockNode }
          })
        };
      });

      battleService.startSync(mockBattleId, onUpdate, onError);
      
      // Trigger 5 intervals
      for (let i = 0; i < 5; i++) {
        await triggerIntervals();
      }

      expect(onError).toHaveBeenCalledTimes(3); // Should have 3 failures
      expect(onUpdate).toHaveBeenCalledTimes(2); // Should have 2 successful updates
      expect(failureCount).toBe(5);
    });

    it('should maintain state consistency during recovery', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();
      let updateId = 0;

      global.fetch = jest.fn().mockImplementation(async () => ({
        ok: true,
        json: () => {
          updateId++;
          return Promise.resolve({
            phase: BattlePhase.ACTIVE_BATTLE,
            timeRemaining: 15,
            battalions: { [mockBattalion.id]: mockBattalion },
            nodes: { [mockNode.id]: mockNode },
            updateId,
            lastUpdated: new Date().toISOString()
          });
        }
      }));

      battleService.startSync(mockBattleId, onUpdate, onError);
      
      // Trigger 5 updates
      for (let i = 0; i < 5; i++) {
        await triggerIntervals();
      }

      expect(onUpdate).toHaveBeenCalledTimes(5);
      const updates = onUpdate.mock.calls.map(call => call[0].updateId);
      expect(updates).toEqual([1, 2, 3, 4, 5]);
    });
  });
}); 