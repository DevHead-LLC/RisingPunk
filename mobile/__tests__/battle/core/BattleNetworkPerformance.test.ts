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

  mockError(error: Error) {
    if (this.onError) this.onError(error);
  }
}

describe('Battle Network Performance', () => {
  let performanceMonitor: BattlePerformanceMonitor;
  let stateManager: BattleStateManager;
  let mockBattleService: MockBattleService;

  beforeEach(() => {
    performanceMonitor = BattlePerformanceMonitor.getInstance();
    mockBattleService = new MockBattleService();
    stateManager = new BattleStateManager(mockBattleService);
    performanceMonitor.startMonitoring();

    const initialState: BattleState = {
      phase: BattlePhase.PRE_BATTLE,
      battalions: new Map(),
      nodes: new Map(),
      timeRemaining: 0,
      updateId: 0,
      lastUpdated: new Date()
    };

    stateManager.initializeBattle('test-battle', initialState);
  });

  afterEach(() => {
    performanceMonitor.cleanup();
  });

  describe('Network Error Recovery', () => {
    // Test: Validate state consistency after network error
    test('should maintain state consistency after network error', () => {
      // Given - Initial state with PRE_BATTLE phase
      const initialPhase = stateManager.getState().phase;
      
      // When - Network error occurs
      mockBattleService.mockError(new Error('Network error'));
      
      // Then - State should remain consistent
      const finalState = stateManager.getState();
      expect(finalState.phase).toBe(initialPhase);
    });

    // Test: Verify performance monitoring during network issues
    test('should track network latency', () => {
      // Given - Network latency threshold
      const latencyThreshold = 200;
      
      // When - Record network latency
      performanceMonitor.recordNetworkLatency(150);
      
      // Then - Should be under threshold
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.networkLatency).toBeLessThan(latencyThreshold);
    });

    // Test: Verify memory usage monitoring
    test('should monitor memory usage', () => {
      // Given - Memory usage threshold
      const memoryThreshold = 80;
      
      // When - Record memory usage
      performanceMonitor.recordMemoryUsage(75);
      
      // Then - Should be under threshold
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBeLessThan(memoryThreshold);
    });
  });
}); 