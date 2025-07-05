/**
 * @file useBattleState.ts
 * @description Battle state management hook with timer functionality
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { BattlePhase } from '../types/battleTypes';
import { 
  BattleStateData, 
  BattleStateAction, 
  BattleTimerConfig 
} from '../types/battleState';

// Timer configuration from intentions documents
const TIMER_CONFIG: BattleTimerConfig = {
  countdownDuration: 3,  // 3-second countdown
  battleDuration: 20     // 20-second battle
};

// Initial state
const initialState: BattleStateData = {
  phase: BattlePhase.COUNTDOWN,
  countdown: TIMER_CONFIG.countdownDuration,
  battleTime: 0,
  maxBattleTime: TIMER_CONFIG.battleDuration,
  isPaused: false
};

// State reducer
function battleStateReducer(state: BattleStateData, action: BattleStateAction): BattleStateData {
  switch (action.type) {
    case 'START_COUNTDOWN':
      return {
        ...state,
        phase: BattlePhase.COUNTDOWN,
        countdown: TIMER_CONFIG.countdownDuration,
        battleTime: 0,
        isPaused: false
      };

    case 'START_BATTLE':
      return {
        ...state,
        phase: BattlePhase.ACTIVE,
        countdown: 0,
        battleTime: 0,
        isPaused: false
      };

    case 'END_BATTLE':
      return {
        ...state,
        phase: BattlePhase.COMPLETE,
        isPaused: true
      };

    case 'UPDATE_TIMER':
      return {
        ...state,
        battleTime: action.time
      };

    case 'UPDATE_COUNTDOWN':
      return {
        ...state,
        countdown: action.countdown
      };

    case 'PAUSE_BATTLE':
      return {
        ...state,
        isPaused: true
      };

    case 'RESUME_BATTLE':
      return {
        ...state,
        isPaused: false
      };

    case 'RESET_BATTLE':
      return initialState;

    default:
      return state;
  }
}

export function useBattleState() {
  const [state, dispatch] = useReducer(battleStateReducer, initialState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const countdownValueRef = useRef(initialState.countdown);
  const battleTimeRef = useRef(initialState.battleTime);
  const isPausedRef = useRef(initialState.isPaused);

  // Cleanup timers
  const cleanupTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Start countdown (3 seconds)
  const startCountdown = useCallback(() => {
    cleanupTimers();
    dispatch({ type: 'START_COUNTDOWN' });
    countdownValueRef.current = TIMER_CONFIG.countdownDuration;

    countdownRef.current = setInterval(() => {
      countdownValueRef.current -= 1;
      if (countdownValueRef.current <= 0) {
        // Countdown finished, start battle
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        dispatch({ type: 'START_BATTLE' });
      } else {
        dispatch({ type: 'UPDATE_COUNTDOWN', countdown: countdownValueRef.current });
      }
    }, 1000);
  }, [cleanupTimers]);

  // Start battle timer (20 seconds)
  const startBattle = useCallback(() => {
    cleanupTimers();
    dispatch({ type: 'START_BATTLE' });
    battleTimeRef.current = 0;
    isPausedRef.current = false;

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      
      battleTimeRef.current += 1;
      if (battleTimeRef.current >= TIMER_CONFIG.battleDuration) {
        // Battle time expired
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        dispatch({ type: 'END_BATTLE', winner: 'enemy' }); // Default to enemy win on timeout
      } else {
        dispatch({ type: 'UPDATE_TIMER', time: battleTimeRef.current });
      }
    }, 1000);
  }, [cleanupTimers]);

  // End battle
  const endBattle = useCallback((winner: 'user' | 'enemy') => {
    cleanupTimers();
    dispatch({ type: 'END_BATTLE', winner });
  }, [cleanupTimers]);

  // Pause battle
  const pauseBattle = useCallback(() => {
    isPausedRef.current = true;
    dispatch({ type: 'PAUSE_BATTLE' });
  }, []);

  // Resume battle
  const resumeBattle = useCallback(() => {
    isPausedRef.current = false;
    dispatch({ type: 'RESUME_BATTLE' });
  }, []);

  // Reset battle
  const resetBattle = useCallback(() => {
    cleanupTimers();
    countdownValueRef.current = initialState.countdown;
    battleTimeRef.current = initialState.battleTime;
    isPausedRef.current = initialState.isPaused;
    dispatch({ type: 'RESET_BATTLE' });
  }, [cleanupTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanupTimers;
  }, [cleanupTimers]);

  return {
    state,
    dispatch,
    startCountdown,
    startBattle,
    endBattle,
    pauseBattle,
    resumeBattle,
    resetBattle,
    timerConfig: TIMER_CONFIG
  };
} 