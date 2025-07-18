/**
 * @file useBattleState.ts
 * @description Battle state management hook with server-synced timer functionality
 */

import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { BattlePhase } from '../types/battleTypes';
import {
  BattleStateData,
  BattleStateAction,
  BattleTimerConfig,
} from '../types/battleState';
import { CountdownTimerService, TimerCallbacks } from '../services/CountdownTimerService';

// Timer configuration from intentions documents
const TIMER_CONFIG: BattleTimerConfig = {
  countdownDuration: 3,  // 3-second countdown
  battleDuration: 20,     // 20-second battle
};

// Initial state
const initialState: BattleStateData = {
  phase: BattlePhase.COUNTDOWN,
  countdown: TIMER_CONFIG.countdownDuration,
  battleTime: 0,
  maxBattleTime: TIMER_CONFIG.battleDuration,
  isPaused: false,
};

// State reducer - only the actions actually used in BattleGridScreen workflow
function battleStateReducer(state: BattleStateData, action: BattleStateAction): BattleStateData {
  switch (action.type) {
    case 'START_COUNTDOWN':
      return {
        ...state,
        phase: BattlePhase.COUNTDOWN,
        countdown: TIMER_CONFIG.countdownDuration,
        battleTime: 0,
        isPaused: false,
      };

    case 'START_BATTLE':
      return {
        ...state,
        phase: BattlePhase.ACTIVE,
        countdown: 0,
        battleTime: 0,
        isPaused: false,
      };

    case 'END_BATTLE':
      return {
        ...state,
        phase: BattlePhase.COMPLETE,
        isPaused: true,
      };

    default:
      return state;
  }
}

export function useBattleState() {
  const [state, dispatch] = useReducer(battleStateReducer, initialState);
  const [countdown, setCountdown] = useState(initialState.countdown);
  const [battleTime, setBattleTime] = useState(initialState.battleTime);
  const timerServiceRef = useRef<CountdownTimerService | null>(null);
  const battleIdRef = useRef<string | null>(null);

  // Cleanup timer service
  const cleanupTimerService = useCallback(() => {
    if (timerServiceRef.current) {
      timerServiceRef.current.stopTimerSync();
      timerServiceRef.current = null;
    }
  }, []);

  // Start countdown with server sync
  const startCountdown = useCallback((battleId: string) => {
    cleanupTimerService();
    dispatch({ type: 'START_COUNTDOWN' });
    battleIdRef.current = battleId;

    // Create timer service instance
    timerServiceRef.current = new CountdownTimerService();

    // Set up callbacks for timer updates
    const callbacks: TimerCallbacks = {
      onCountdownUpdate: (newCountdown: number) => {
        setCountdown(newCountdown);
      },
      onPhaseChange: (newPhase: BattlePhase) => {
        if (newPhase === BattlePhase.ACTIVE) {
          dispatch({ type: 'START_BATTLE' });
          setCountdown(0);
        }
      },
      onBattleTimeUpdate: (newBattleTime: number) => {
        setBattleTime(newBattleTime);
      },
      onBattleEnd: (winner: 'user' | 'enemy') => {
        dispatch({ type: 'END_BATTLE', winner });
      },
    };

    // Start server sync
    timerServiceRef.current.startTimerSync(battleId, callbacks);
  }, [cleanupTimerService]);

  // Start battle timer (20 seconds) - now handled by server
  const startBattle = useCallback(() => {
    // Battle timer is now managed by server through CountdownTimerService
    // This method is kept for compatibility but does nothing
    
  }, []);

  // End battle
  const endBattle = useCallback((winner: 'user' | 'enemy') => {
    cleanupTimerService();
    dispatch({ type: 'END_BATTLE', winner });
  }, [cleanupTimerService]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanupTimerService;
  }, [cleanupTimerService]);

  // Combine state with local timer values
  const combinedState = {
    ...state,
    countdown,
    battleTime,
  };

  return {
    state: combinedState,
    dispatch,
    startCountdown,
    startBattle,
    endBattle,
    timerConfig: TIMER_CONFIG,
  };
}
