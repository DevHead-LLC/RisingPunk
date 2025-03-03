// Implementation of @battle-performance-standards.mdc#Core-Requirements
// Tests performance monitoring system

import { BattlePerformanceMonitor } from '../../../src/battle/core/BattlePerformanceMonitor';
import { Platform } from 'react-native';

describe('BattlePerformanceMonitor', () => {
  let monitor: BattlePerformanceMonitor;
  let mockNow: number;
  let originalPerformance: any;
  let mockMemory: any;
  let rafCallbacks: Function[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    mockNow = 0;
    originalPerformance = global.performance;
    rafCallbacks = [];

    // Mock memory with controlled values that will trigger warnings
    mockMemory = {
      usedJSHeapSize: 85 * 1024 * 1024, // 85MB used (85% of limit)
      jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB limit
      totalJSHeapSize: 150 * 1024 * 1024
    };

    // Mock performance.now() with controlled timing
    const mockPerformanceNow = jest.fn(() => mockNow);

    // Set up global performance object with memory
    global.performance = {
      now: mockPerformanceNow,
      memory: mockMemory
    };

    // Mock Platform.OS
    Platform.OS = 'web';

    // Mock RAF to store callbacks
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });

    // Mock CAF
    global.cancelAnimationFrame = jest.fn((id: number) => {
      rafCallbacks[id - 1] = () => {};
    });

    // Get fresh instance and reset state
    monitor = BattlePerformanceMonitor.getInstance();
    monitor.cleanup();
    monitor.startMonitoring();
  });

  afterEach(() => {
    global.performance = originalPerformance;
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Memory Usage Monitoring', () => {
    it('should track memory usage correctly', () => {
      const stats = monitor.checkMemoryUsage();
      expect(stats).toEqual({
        usedJSHeapSize: mockMemory.usedJSHeapSize,
        jsHeapSizeLimit: mockMemory.jsHeapSizeLimit,
        usagePercentage: 85
      });
    });

    it('should log a warning when memory usage is high', () => {
      monitor.checkMemoryUsage();
      jest.advanceTimersByTime(100); // Allow time for warning to be logged
      
      const memoryWarnings = monitor.getLogs().filter(log => log.type === 'memory_warning');
      expect(memoryWarnings).toHaveLength(1);
      expect(memoryWarnings[0].details.value).toBe(85); // 85% usage
    });
  });

  describe('Frame Rate Monitoring', () => {
    beforeEach(() => {
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.cleanup();
    });

    it('should track frame rate correctly', () => {
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.startMonitoring();
      
      // Simulate exactly 60 frames over 1 second
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame();
        monitor._setMockTime((i + 1) * (1000 / 60));
      }
      
      // Set time to exactly 1 second to trigger calculation
      monitor._setMockTime(1000);
      
      const metrics = monitor.getMetrics();
      expect(metrics.frameRate).toBe(60);
    });

    it('should log frame rate drops', () => {
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.startMonitoring();
      
      // Simulate exactly 30 frames over 1 second
      for (let i = 0; i < 30; i++) {
        monitor.recordFrame();
        monitor._setMockTime((i + 1) * (1000 / 30));
      }
      
      // Set time to exactly 1 second to trigger calculation
      monitor._setMockTime(1000);
      
      const metrics = monitor.getMetrics();
      expect(metrics.frameRate).toBe(30);
      
      const logs = monitor.getLogs();
      expect(logs.filter(log => log.type === 'frame_drop').length).toBe(1);
    });
  });

  describe('Load Time Monitoring', () => {
    beforeEach(() => {
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.cleanup();
    });

    it('should track load time correctly', () => {
      const monitor = BattlePerformanceMonitor.getInstance();
      monitor.startMonitoring();
      
      // Start load at time 0
      monitor._setMockTime(0);
      monitor.recordLoadStart();
      
      // Complete load at 1500ms
      monitor._setMockTime(1500);
      monitor.recordLoadComplete();
      
      const metrics = monitor.getMetrics();
      expect(metrics.loadTime).toBe(1500);
      
      const logs = monitor.getLogs();
      expect(logs.filter(log => log.type === 'load_time').length).toBe(1);
    });
  });

  describe('Network Latency Monitoring', () => {
    it('should track high network latency', () => {
      monitor.recordNetworkLatency(250);
      
      const latencyLogs = monitor.getLogs().filter(log => log.type === 'network_latency');
      expect(latencyLogs).toHaveLength(1);
      expect(latencyLogs[0].details.value).toBe(250);
    });

    it('should not log normal network latency', () => {
      monitor.recordNetworkLatency(150);
      
      const latencyLogs = monitor.getLogs().filter(log => log.type === 'network_latency');
      expect(latencyLogs).toHaveLength(0);
    });
  });
}); 