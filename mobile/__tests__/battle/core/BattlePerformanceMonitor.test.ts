// Implementation of @battle-performance-standards.mdc#Core-Requirements
// Tests performance monitoring system

import { BattlePerformanceMonitor } from '../../../src/battle/core/BattlePerformanceMonitor';

describe('BattlePerformanceMonitor', () => {
  let monitor: BattlePerformanceMonitor;
  let mockNow: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    // Mock performance.now() to return controlled values
    mockNow = jest.spyOn(performance, 'now');
    mockNow.mockReturnValue(0);
    monitor = BattlePerformanceMonitor.getInstance();
    monitor.cleanup(); // Clear any previous state
    monitor.startMonitoring();
  });

  afterEach(() => {
    monitor.cleanup();
    mockNow.mockRestore();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Frame Rate Monitoring', () => {
    it('should track frame rate correctly', () => {
      // Simulate 60 frames in one second
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame();
      }

      mockNow.mockReturnValue(1000);
      jest.advanceTimersByTime(1000);
      const metrics = monitor.getMetrics();
      expect(metrics.frameRate).toBeCloseTo(60, 0);
    });

    it('should log frame rate drops', () => {
      // Simulate 30 frames in one second (low frame rate)
      for (let i = 0; i < 30; i++) {
        monitor.recordFrame();
      }

      mockNow.mockReturnValue(1000);
      jest.advanceTimersByTime(1000);
      const logs = monitor.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].type).toBe('frame_drop');
      expect(logs[0].details.value).toBeLessThan(55);
    });
  });

  describe('Memory Usage Monitoring', () => {
    beforeEach(() => {
      // Mock performance.memory with normal usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024, // 50MB
          jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
        },
        configurable: true
      });
    });

    it('should track memory usage correctly', () => {
      mockNow.mockReturnValue(5000);
      jest.advanceTimersByTime(5000);
      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBe(0.5); // 50%
    });

    it('should log high memory usage', () => {
      // Start fresh with high memory usage
      monitor.cleanup();
      monitor.startMonitoring();

      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 90 * 1024 * 1024, // 90MB
          jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
        },
        configurable: true
      });

      // Advance time and trigger memory check
      mockNow.mockReturnValue(5000);
      jest.advanceTimersByTime(5000);

      // Force a memory check
      monitor['checkMemoryUsage']();

      // Ensure no frames are recorded to prevent frame rate logs
      const logs = monitor.getLogs().filter(log => log.type === 'memory_warning');
      expect(logs.length).toBe(1);
      expect(logs[0].type).toBe('memory_warning');
      expect(logs[0].details.value).toBeGreaterThan(80);

      // Advance time but don't trigger another warning
      mockNow.mockReturnValue(7500);
      jest.advanceTimersByTime(2500);
      const newLogs = monitor.getLogs().filter(log => log.type === 'memory_warning');
      expect(newLogs.length).toBe(1);
    });
  });

  describe('JS Thread Usage Monitoring', () => {
    it('should track JS thread usage correctly', () => {
      monitor.recordJSThreadUsage(0.5); // 50% usage
      const metrics = monitor.getMetrics();
      expect(metrics.jsThreadUsage).toBe(0.5);
    });

    it('should log high JS thread usage', () => {
      monitor.recordJSThreadUsage(0.9); // 90% usage
      const logs = monitor.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].type).toBe('error');
      expect(logs[0].details.value).toBeGreaterThan(80);
    });
  });

  describe('Subscription System', () => {
    it('should notify subscribers of metric updates', () => {
      const mockCallback = jest.fn();
      monitor.subscribe(mockCallback);

      // Simulate frame updates
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame();
      }

      mockNow.mockReturnValue(1000);
      jest.advanceTimersByTime(1000);
      expect(mockCallback).toHaveBeenCalled();
      const lastCall = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
      expect(lastCall.frameRate).toBeCloseTo(60, 0);
    });

    it('should allow unsubscribing', () => {
      const mockCallback = jest.fn();
      const unsubscribe = monitor.subscribe(mockCallback);

      unsubscribe();
      monitor.recordJSThreadUsage(0.5);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should stop monitoring and clear data', () => {
      monitor.cleanup();

      // Verify intervals are cleared
      mockNow.mockReturnValue(5000);
      jest.advanceTimersByTime(5000);
      const metrics = monitor.getMetrics();
      expect(metrics.frameRate).toBe(60); // Should remain at initial value
      expect(monitor.getLogs()).toHaveLength(0);
    });
  });

  describe('Load Time Monitoring', () => {
    let nowMock: number;

    beforeEach(() => {
      nowMock = 1000;
      jest.spyOn(performance, 'now').mockImplementation(() => nowMock);
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.cleanup(); // Reset the monitor state
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should track load time correctly', () => {
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.startMonitoring();
      
      // Simulate time passing
      nowMock = 2500;
      
      monitor.recordLoadComplete();
      const metrics = monitor.getMetrics();
      
      expect(metrics.loadTime).toBe(1500);
      expect(monitor.getLogs()).toContainEqual(
        expect.objectContaining({
          type: 'load_time',
          details: expect.objectContaining({
            value: 1500,
            threshold: 1000
          })
        })
      );
    });
  });

  describe('Network Latency Monitoring', () => {
    it('should track network latency correctly', () => {
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.startMonitoring();
      
      monitor.recordNetworkLatency(250); // Above threshold
      const metrics = monitor.getMetrics();
      
      expect(metrics.networkLatency).toBe(250);
      expect(monitor.getLogs()).toContainEqual(
        expect.objectContaining({
          type: 'network_latency',
          details: expect.objectContaining({
            value: 250,
            threshold: 200
          })
        })
      );
    });

    it('should not log normal network latency', () => {
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.startMonitoring();
      
      const initialLogCount = monitor.getLogs().length;
      monitor.recordNetworkLatency(150); // Below threshold
      
      expect(monitor.getLogs().length).toBe(initialLogCount);
      expect(monitor.getMetrics().networkLatency).toBe(150);
    });
  });
}); 