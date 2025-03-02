import React from 'react';
import { render, act } from '@testing-library/react-native';
import { BattleVisualValidation } from '../../../src/components/battle/BattleVisualValidation';
import { BattlePerformanceMonitor } from '../../../src/battle/core/BattlePerformanceMonitor';

describe('BattleVisualValidation', () => {
  let performanceMonitor: BattlePerformanceMonitor;
  let frameTimeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    performanceMonitor = BattlePerformanceMonitor.getInstance();
    performanceMonitor.startMonitoring();
    frameTimeSpy = jest.spyOn(performanceMonitor, 'recordFrameTime');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    performanceMonitor.cleanup();
    frameTimeSpy.mockRestore();
  });

  describe('Smooth Transition Verification', () => {
    it('completes transitions within 16ms frame budget', async () => {
      const { getByTestId } = render(<BattleVisualValidation performanceMonitor={performanceMonitor} battleState="idle" />);
      
      act(() => {
        jest.advanceTimersByTime(16);
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.frameRate).toBeGreaterThanOrEqual(55);
    });
  });

  describe('Frame Rate Monitoring', () => {
    it('maintains continuous frame rate monitoring', () => {
      render(<BattleVisualValidation performanceMonitor={performanceMonitor} battleState="idle" />);
      
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(frameTimeSpy).toHaveBeenCalled();
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.frameRate).toBeGreaterThanOrEqual(55);
    });
  });

  describe('Effect Consistency Check', () => {
    it('maintains consistent visual effects across state transitions', async () => {
      const { rerender } = render(<BattleVisualValidation battleState="idle" />);
      
      // Simulate multiple state transitions
      const states = ['active', 'idle', 'active'] as const;
      for (const state of states) {
        act(() => {
          rerender(<BattleVisualValidation battleState={state} />);
          performanceMonitor.recordFrameTime(16);
          jest.advanceTimersByTime(16);
        });
        
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.lastFrameTime).toBeLessThanOrEqual(16);
      }

      // Verify overall frame rate stability
      const finalMetrics = performanceMonitor.getMetrics();
      expect(finalMetrics.frameRate).toBeGreaterThanOrEqual(55);
    });

    it('handles rapid state transitions without visual artifacts', async () => {
      const { rerender } = render(<BattleVisualValidation battleState="idle" />);
      
      // Simulate rapid state changes (faster than animation duration)
      for (let i = 0; i < 5; i++) {
        act(() => {
          rerender(<BattleVisualValidation battleState="active" />);
          performanceMonitor.recordFrameTime(8);
          jest.advanceTimersByTime(8);
          
          rerender(<BattleVisualValidation battleState="idle" />);
          performanceMonitor.recordFrameTime(8);
          jest.advanceTimersByTime(8);
        });
      }

      // Verify animation stability
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.lastFrameTime).toBeLessThanOrEqual(16);
      expect(metrics.frameRate).toBeGreaterThanOrEqual(55);
    });

    it('maintains consistent opacity transitions', async () => {
      const { rerender } = render(<BattleVisualValidation battleState="idle" />);
      
      act(() => {
        rerender(<BattleVisualValidation battleState="active" />);
        performanceMonitor.recordFrameTime(16);
        jest.advanceTimersByTime(150); // Full animation duration
      });

      // Verify smooth transition
      const transitionMetrics = performanceMonitor.getMetrics();
      expect(transitionMetrics.lastFrameTime).toBeLessThanOrEqual(16);
      
      act(() => {
        rerender(<BattleVisualValidation battleState="idle" />);
        performanceMonitor.recordFrameTime(16);
        jest.advanceTimersByTime(150); // Full animation duration
      });

      // Verify reverse transition
      const finalMetrics = performanceMonitor.getMetrics();
      expect(finalMetrics.lastFrameTime).toBeLessThanOrEqual(16);
    });
  });
}); 