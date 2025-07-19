/**
 * @file useBattleState.test.ts
 * @description Tests for useBattleState hook
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useBattleState } from '../../src/hooks/useBattleState';
import { BattlePhase } from '../../src/types/battleTypes';

// Mock timers
jest.useFakeTimers();

describe('useBattleState', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with countdown phase', () => {
    const { result } = renderHook(() => useBattleState());

    expect(result.current.state.phase).toBe(BattlePhase.COUNTDOWN);
    expect(result.current.state.countdown).toBe(3);
    expect(result.current.state.battleTime).toBe(0);
    expect(result.current.state.isPaused).toBe(false);
  });

  it('should start countdown and transition to active phase', () => {
    const { result } = renderHook(() => useBattleState());

    act(() => {
      result.current.startCountdown('test-battle-id');
    });

    // Should start countdown
    expect(result.current.state.phase).toBe(BattlePhase.COUNTDOWN);
    expect(result.current.state.countdown).toBe(3);

    // Advance timer by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.state.countdown).toBe(2);

    // Advance timer by 2 more seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should transition to active phase
    expect(result.current.state.phase).toBe(BattlePhase.ACTIVE);
    expect(result.current.state.countdown).toBe(0);
    expect(result.current.state.battleTime).toBe(0);
  });

  it('should start battle timer and count up', () => {
    const { result } = renderHook(() => useBattleState());

    act(() => {
      result.current.startBattle();
    });

    expect(result.current.state.phase).toBe(BattlePhase.ACTIVE);
    expect(result.current.state.battleTime).toBe(0);

    // Advance timer by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.state.battleTime).toBe(5);
  });

  it('should end battle after 20 seconds', () => {
    const { result } = renderHook(() => useBattleState());

    act(() => {
      result.current.startBattle();
    });

    // Advance timer by 20 seconds
    act(() => {
      jest.advanceTimersByTime(20000);
    });

    expect(result.current.state.phase).toBe(BattlePhase.COMPLETE);
    expect(result.current.state.isPaused).toBe(true);
  });

  it('should end battle manually', () => {
    const { result } = renderHook(() => useBattleState());

    act(() => {
      result.current.startBattle();
    });

    act(() => {
      result.current.endBattle('user');
    });

    expect(result.current.state.phase).toBe(BattlePhase.COMPLETE);
    expect(result.current.state.isPaused).toBe(true);
  });

  it('should provide timer configuration', () => {
    const { result } = renderHook(() => useBattleState());

    expect(result.current.timerConfig.countdownDuration).toBe(3);
    expect(result.current.timerConfig.battleDuration).toBe(20);
  });
});
