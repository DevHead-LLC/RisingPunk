import { BattlePerformanceMonitoring } from '../../../src/battle/core/BattlePerformanceMonitoring';
import { BattleState } from '../../../src/battle/core/BattleTypes';
import { Platform } from 'react-native';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web'
  }
}));

describe('Battle Performance Monitoring', () => {
  let performanceMonitor: BattlePerformanceMonitoring;
  let mockNow: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockNow = jest.spyOn(performance, 'now');
    mockNow.mockReturnValue(0);

    performanceMonitor = BattlePerformanceMonitoring.getInstance();
    performanceMonitor.start();
  });

  afterEach(() => {
    performanceMonitor.stop();
    mockNow.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Network Performance', () => {
    it('should track network latency', async () => {
      const startTime = 1000;
      mockNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 100);

      const latency = await performanceMonitor.recordNetworkLatency(100);
      expect(latency).toBe(100);
    });

    it('should log excessive latency', async () => {
      const mockLogger = jest.spyOn(console, 'warn');
      const startTime = 1000;
      mockNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 250);

      await performanceMonitor.recordNetworkLatency(250);
      expect(mockLogger).toHaveBeenCalledWith('High network latency: 250ms');
      mockLogger.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should monitor memory usage', () => {
      const mockLogger = jest.spyOn(console, 'warn');
      performanceMonitor.checkMemoryUsage(50);
      expect(mockLogger).not.toHaveBeenCalled();
      mockLogger.mockRestore();
    });

    it('should warn on high memory usage', () => {
      const mockLogger = jest.spyOn(console, 'warn');
      performanceMonitor.checkMemoryUsage(85);
      expect(mockLogger).toHaveBeenCalledWith('High memory usage: 85%');
      mockLogger.mockRestore();
    });
  });

  describe('State Synchronization', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should track sync timing', async () => {
      const startTime = 1000;
      mockNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 50);

      const syncPromise = performanceMonitor.measureSyncDuration();
      jest.advanceTimersByTime(50); // Advance timers to resolve the setTimeout
      const syncTiming = await syncPromise;
      expect(syncTiming).toBe(50);
    });

    it('should batch state updates efficiently', async () => {
      const updates: Partial<BattleState>[] = [
        { timeRemaining: 15 },
        { timeRemaining: 14 },
        { timeRemaining: 13 }
      ];
      
      const startTime = 1000;
      mockNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 30);

      const batchPromise = performanceMonitor.measureBatchUpdates(updates);
      jest.advanceTimersByTime(30); // Advance timers to resolve all setTimeouts
      const batchTiming = await batchPromise;
      expect(batchTiming).toBe(30);
    });
  });
}); 