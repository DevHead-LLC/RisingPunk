// Implementation of @battle-state-persistence.mdc#Network-Integration
// Tests network state synchronization, error handling, and performance

import { BattleService } from '../../../src/services/BattleService';
import { BattleState, BattalionState, NodeState } from '../../../src/battle/core/BattleStateManager';
import { Position } from '../../../src/battle/core/types';
import { BattlePhase } from '../../../src/battle/core/BattleContext';

let mockTimerId = 1;

// Create mock setInterval function
const createMockInterval = () => {
  const mock = jest.fn().mockImplementation((callback: Function) => {
    setTimeout(callback, 0);
    return mockTimerId++;
  });
  return Object.assign(mock, { __promisify__: jest.fn() }) as unknown as typeof global.setInterval;
};

describe('Battle Network Integration', () => {
  let battleService: BattleService;
  const mockBattleId = 'test-battle-123';

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
    mockTimerId = 1;
    global.setInterval = createMockInterval();
    global.clearInterval = jest.fn();
  });

  afterEach(() => {
    battleService.stopSync();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

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

      // Mock successful sync
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockState)
      });

      battleService.startSync(mockBattleId, onUpdate, onError);
      await jest.runAllTimersAsync();
      await Promise.resolve(); // Wait for fetch
      await Promise.resolve(); // Wait for state transformation

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

      // Mock network failure
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      battleService.startSync(mockBattleId, onUpdate, onError);
      await jest.runAllTimersAsync();
      await Promise.resolve(); // Wait for fetch

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

      // Mock setInterval to call the callback multiple times
      const mockInterval = (createMockInterval() as unknown as jest.Mock).mockImplementation(callback => {
        for (let i = 0; i < 4; i++) {
          setTimeout(callback, 0);
        }
        return mockTimerId++;
      });
      global.setInterval = mockInterval as unknown as typeof global.setInterval;

      battleService.startSync(mockBattleId, onUpdate, onError);
      await jest.runAllTimersAsync();
      await Promise.resolve(); // Wait for fetch

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
      global.fetch = jest.fn().mockImplementation(async () => ({
        ok: true,
        json: () => Promise.resolve({
          phase: BattlePhase.ACTIVE_BATTLE,
          timeRemaining: 15,
          battalions: { [mockBattalion.id]: mockBattalion },
          nodes: { [mockNode.id]: mockNode }
        })
      }));

      // Mock setInterval to call the callback 5 times
      const mockInterval = (createMockInterval() as unknown as jest.Mock).mockImplementation(callback => {
        for (let i = 0; i < 5; i++) {
          setTimeout(callback, 0);
          callCount++;
        }
        return mockTimerId++;
      });
      global.setInterval = mockInterval as unknown as typeof global.setInterval;

      battleService.startSync(mockBattleId, onUpdate, onError);
      await jest.runAllTimersAsync();
      await Promise.resolve(); // Wait for fetch
      await Promise.resolve(); // Wait for state transformation

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
  });
}); 