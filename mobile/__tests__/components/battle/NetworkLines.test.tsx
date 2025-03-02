import React from 'react';
import { render } from '@testing-library/react-native';
import { NetworkLines } from '../../../src/components/battle/NetworkLines';
import { BattlePerformanceMonitor } from '../../../src/battle/core/BattlePerformanceMonitor';

jest.useFakeTimers();

describe('NetworkLines Performance', () => {
  let performanceMonitor: BattlePerformanceMonitor;
  const mockNodes = Array.from({ length: 9 }, (_, i) => ({
    x: (i % 3) * 100,
    y: Math.floor(i / 3) * 100
  }));

  beforeEach(() => {
    performanceMonitor = BattlePerformanceMonitor.getInstance();
    performanceMonitor.startMonitoring();
  });

  afterEach(() => {
    performanceMonitor.cleanup();
    jest.clearAllTimers();
  });

  it('should maintain 60fps during initial render', () => {
    const startTime = performance.now();
    render(<NetworkLines nodes={mockNodes} width={300} height={300} />);
    const renderTime = performance.now() - startTime;
    
    // 16.67ms is one frame at 60fps
    expect(renderTime).toBeLessThan(16.67);
    expect(performanceMonitor.getMetrics().frameRate).toBeGreaterThanOrEqual(55);
  });

  it('should optimize memory usage for data streams', () => {
    render(<NetworkLines nodes={mockNodes} width={300} height={300} />);
    const memoryStats = performanceMonitor.checkMemoryUsage();
    expect(memoryStats.usagePercentage).toBeLessThan(80);
  });

  it('should handle rapid node updates efficiently', () => {
    const { rerender } = render(<NetworkLines nodes={mockNodes} width={300} height={300} />);
    
    // Simulate 60 updates in one second
    for (let i = 0; i < 60; i++) {
      const updatedNodes = mockNodes.map(node => ({
        x: node.x + Math.sin(i * 0.1) * 5,
        y: node.y + Math.cos(i * 0.1) * 5
      }));
      
      const startTime = performance.now();
      rerender(<NetworkLines nodes={updatedNodes} width={300} height={300} />);
      const updateTime = performance.now() - startTime;
      
      expect(updateTime).toBeLessThan(16.67);
      performanceMonitor.recordFrame();
    }
    
    expect(performanceMonitor.getMetrics().frameRate).toBeGreaterThanOrEqual(55);
  });

  it('should maintain performance with maximum connections', () => {
    // Test with all possible connections (worst case)
    const maxNodes = Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) * 100,
      y: Math.floor(i / 3) * 100
    }));
    
    const startTime = performance.now();
    render(<NetworkLines nodes={maxNodes} width={300} height={300} />);
    const renderTime = performance.now() - startTime;
    
    expect(renderTime).toBeLessThan(16.67);
    expect(performanceMonitor.getMetrics().jsThreadUsage).toBeLessThan(0.8);
  });
}); 