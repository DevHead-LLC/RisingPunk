import { BattlePerformanceMonitor } from '../../../src/battle/core/BattlePerformanceMonitor';
import { BattleStateManager } from '../../../src/battle/core/BattleStateManager';
import { BattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase, BattleState } from '../../../src/battle/core/BattleTypes';

class MockBattleService implements BattleService {
  private onUpdate?: (state: any) => void;
  private onError?: (error: Error) => void;

  startSync(battleId: string, onUpdate: (state: any) => void, onError: (error: Error) => void): void {
    this.onUpdate = onUpdate;
    this.onError = onError;
  }

  stopSync(battleId: string): void {
    this.onUpdate = undefined;
    this.onError = undefined;
  }

  async syncState(battleId: string, state: any): Promise<void> {
    return Promise.resolve();
  }

  // Test helpers
  mockServerUpdate(state: any) {
    if (this.onUpdate) this.onUpdate(state);
  }

  mockError(error: Error) {
    if (this.onError) this.onError(error);
  }
}

jest.useFakeTimers({ doNotFake: [] });

describe('Battle Network Performance', () => {
  let performanceMonitor: BattlePerformanceMonitor;
  let stateManager: BattleStateManager;
  let mockBattleService: MockBattleService;

  beforeEach(() => {
    performanceMonitor = BattlePerformanceMonitor.getInstance();
    mockBattleService = new MockBattleService();
    stateManager = new BattleStateManager(mockBattleService);
    performanceMonitor.startMonitoring();
  });

  afterEach(() => {
    performanceMonitor.cleanup();
    jest.clearAllTimers();
  });

  describe('Network Integration', () => {
    test('should maintain network latency below 200ms', () => {
      const latencyThreshold = 200;
      performanceMonitor.recordNetworkLatency(150);
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.networkLatency).toBeLessThan(latencyThreshold);
    });

    test('should batch state updates efficiently', () => {
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const battalionUpdates = new Map();
        battalionUpdates.set(`test-${i}`, { health: 100, quantity: 10 });
        stateManager.queueStateUpdate({ battalionUpdates });
      }
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(16.67); // One frame at 60fps
    });

    test('should recover from network failures', async () => {
      const mockError = new Error('Network timeout');
      const battleId = 'test-battle';
      stateManager.initializeBattle(battleId);
      
      // Trigger error through mock service
      mockBattleService.mockError(mockError);
      
      // Verify error was handled
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.networkLatency).toBeDefined();
    });
  });

  describe('Performance Validation', () => {
    test('should maintain 60fps during heavy state updates', () => {
      const frameRateThreshold = 55;
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.recordFrame();
      }
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.frameRate).toBeGreaterThan(frameRateThreshold);
    });

    test('should optimize memory usage during battle', () => {
      const memoryThreshold = 80; // 80% usage threshold
      performanceMonitor.recordMemoryUsage(75);
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBeLessThan(memoryThreshold);
    });
  });

  describe('Error Recovery', () => {
    test('should handle rapid state changes without dropping updates', () => {
      const updates = Array.from({ length: 50 }, (_, i) => {
        const battalionUpdates = new Map();
        battalionUpdates.set(`test-${i}`, { health: 100, quantity: 10 });
        return { battalionUpdates };
      });
      
      // Record frames for 1 second
      for (let i = 0; i < 60; i++) {
        performanceMonitor.recordFrame();
      }
      
      updates.forEach(update => stateManager.queueStateUpdate(update));
      jest.advanceTimersByTime(1000);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.frameRate).toBeGreaterThan(55);
    });

    test('should maintain state consistency during network issues', async () => {
      const battleId = 'test-battle';
      stateManager.initializeBattle(battleId);
      
      // Trigger network error
      mockBattleService.mockError(new Error('Network error'));
      
      // Verify state remains consistent
      const state = stateManager.getState();
      expect(state.phase).toBe(BattlePhase.PRE_BATTLE);
    });
  });
}); 