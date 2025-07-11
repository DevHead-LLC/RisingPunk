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

// Battle state actions - only the ones actually used in BattleGridScreen workflow
export type BattleStateAction =
  | { type: 'START_COUNTDOWN' }
  | { type: 'START_BATTLE' }
  | { type: 'END_BATTLE'; winner: 'user' | 'enemy' };

// Battle state context - only the functions actually used
export interface BattleStateContext {
  state: BattleStateData;
  dispatch: (action: BattleStateAction) => void;
  startCountdown: () => void;
  startBattle: () => void;
  endBattle: (winner: 'user' | 'enemy') => void;
}
