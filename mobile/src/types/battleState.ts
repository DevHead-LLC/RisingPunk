/**
 * @file battleState.ts
 * @description Battle state management types
 */

import { BattlePhase } from './battleTypes';

// Battle timer configuration
export interface BattleTimerConfig {
  countdownDuration: number; // 3 seconds
  battleDuration: number;    // 20 seconds
}

// Battle state with timer management
export interface BattleStateData {
  phase: BattlePhase;
  countdown: number;
  battleTime: number;
  maxBattleTime: number;
  isPaused: boolean;
}

// Battle state actions
export type BattleStateAction = 
  | { type: 'START_COUNTDOWN' }
  | { type: 'START_BATTLE' }
  | { type: 'END_BATTLE'; winner: 'user' | 'enemy' }
  | { type: 'UPDATE_TIMER'; time: number }
  | { type: 'UPDATE_COUNTDOWN'; countdown: number }
  | { type: 'PAUSE_BATTLE' }
  | { type: 'RESUME_BATTLE' }
  | { type: 'RESET_BATTLE' };

// Battle state context
export interface BattleStateContext {
  state: BattleStateData;
  dispatch: (action: BattleStateAction) => void;
  startCountdown: () => void;
  startBattle: () => void;
  endBattle: (winner: 'user' | 'enemy') => void;
  pauseBattle: () => void;
  resumeBattle: () => void;
  resetBattle: () => void;
} 