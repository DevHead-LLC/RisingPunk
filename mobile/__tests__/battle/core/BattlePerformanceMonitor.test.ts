// Implementation of @battle-performance-standards.mdc#Core-Requirements
// Tests performance monitoring system

import { BattlePerformanceMonitor } from '../../../src/battle/core/BattlePerformanceMonitor';
import { Platform } from 'react-native';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web'
  }
}));

describe('BattlePerformanceMonitor', () => {
  let monitor: BattlePerformanceMonitor;
  let mockNow: jest.SpyInstance;
  let mockRAF: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    // Mock performance.now() to return controlled values
    mockNow = jest.spyOn(performance, 'now');
    mockNow.mockReturnValue(0);

    // Mock requestAnimationFrame
    mockRAF = jest.spyOn(window, 'requestAnimationFrame');
    mockRAF.mockImplementation(cb => {
      setTimeout(() => cb(performance.now()), 16); // ~60fps
      return 1;
    });

    // Mock performance.memory
    Object.defineProperty(window.performance, 'memory', {
      value: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
        totalJSHeapSize: 100 * 1024 * 1024
      },
      configurable: true,
      enumerable: true,
      writable: true
    });

    monitor = BattlePerformanceMonitor.getInstance();
    monitor.cleanup(); // Clear any previous state
    monitor.startMonitoring();
  });

  afterEach(() => {
    monitor.cleanup();
    mockNow.mockRestore();
    mockRAF.mockRestore();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Frame Rate Monitoring', () => {
    it('should track frame rate correctly', () => {
      // Simulate exactly 60 frames in one second
      for (let i = 0; i < 60; i++) {
        mockNow.mockReturnValue(i * (1000/60)); // Exact frame timing
        monitor.recordFrame();
      }
      mockNow.mockReturnValue(999); // Just before the end of the second
      jest.advanceTimersByTime(1000); // Trigger frame rate calculation
      const metrics = monitor.getMetrics();
      expect(metrics.frameRate).toBe(60);
    });

    it('should log frame rate drops', () => {
      // Simulate 30 frames in one second (low frame rate)
      for (let i = 0; i < 30; i++) {
        mockNow.mockReturnValue(i * (1000/30));
        monitor.recordFrame();
      }

      mockNow.mockReturnValue(1000);
      jest.advanceTimersByTime(1000); // Trigger frame rate calculation
      const logs = monitor.getLogs();
      const frameDrops = logs.filter(log => log.type === 'frame_drop');
      expect(frameDrops.length).toBe(1);
      expect(frameDrops[0].type).toBe('frame_drop');
      expect(frameDrops[0].details.value).toBeLessThan(55);
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should track memory usage correctly', () => {
      // Force a memory check
      const memoryStats = monitor.checkMemoryUsage();
      expect(memoryStats).toEqual({
        usedJSHeapSize: 50 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
        usagePercentage: 50
      });
      expect(monitor.getMetrics().memoryUsage).toBe(50);
    });

    it('should log high memory usage', () => {
      // Mock high memory usage
      Object.defineProperty(window.performance, 'memory', {
        value: {
          usedJSHeapSize: 85 * 1024 * 1024, // 85MB
          jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
          totalJSHeapSize: 100 * 1024 * 1024
        },
        configurable: true,
        enumerable: true,
        writable: true
      });

      // Force a memory check
      monitor.checkMemoryUsage();
      const logs = monitor.getLogs().filter(log => log.type === 'memory_warning');
      expect(logs.length).toBe(1);
      expect(logs[0].type).toBe('memory_warning');
      expect(logs[0].details.value).toBe(85);
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
      const monitor = BattlePerformanceMonitor.getInstance();
      const mockCallback = jest.fn();
      monitor.subscribe(mockCallback);
      monitor.startMonitoring();

      // Mock performance.now() to control timing
      const mockNow = jest.spyOn(performance, 'now');
      let currentTime = 0;
      mockNow.mockImplementation(() => currentTime);

      // Get the frame loop function
      const frameLoop = () => {
        if (monitor['animationFrameId'] !== null) {
          const callback = global.requestAnimationFrame['mock'].calls[global.requestAnimationFrame['mock'].calls.length - 1][0];
          callback();
        }
      };

      // Simulate 58 frames in one second (accounting for the 2 additional frames during timing checks)
      for (let i = 0; i < 58; i++) {
        currentTime = i * (1000 / 60); // Each frame is ~16.67ms
        frameLoop();
      }

      // Move time to just before the end of the second
      currentTime = 999;
      frameLoop();

      // Move time to after the second to trigger frame rate calculation
      currentTime = 1001;
      frameLoop();

      expect(mockCallback).toHaveBeenCalled();
      const lastCall = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
      expect(lastCall.frameRate).toBe(60);

      // Cleanup
      mockNow.mockRestore();
      monitor.stopMonitoring();
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