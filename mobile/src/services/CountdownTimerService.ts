/**
 * @file CountdownTimerService.ts
 * @description Client-side timer service that syncs with server-side BattleTimerService
 */

import { BattlePhase } from '../types/battleTypes';
import { BattleTimerConfig } from '../types/battleState';
import { API_URL } from '../config';
import { store } from '../store';

// Timer configuration from intentions documents
const TIMER_CONFIG: BattleTimerConfig = {
  countdownDuration: 3,  // 3-second countdown
  battleDuration: 20,     // 20-second battle
};

export interface TimerState {
  phase: BattlePhase;
  countdown: number;
  battleTime: number;
  isActive: boolean;
}

export interface TimerCallbacks {
  onCountdownUpdate?: (countdown: number) => void;
  onPhaseChange?: (phase: BattlePhase) => void;
  onBattleEnd?: (winner: 'user' | 'enemy') => void;
}

export class CountdownTimerService {
  private battleId: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private localTimerInterval: NodeJS.Timeout | null = null;
  private callbacks: TimerCallbacks = {};
  private currentState: TimerState = {
    phase: BattlePhase.COUNTDOWN,
    countdown: TIMER_CONFIG.countdownDuration,
    battleTime: 0,
    isActive: false,
  };

  /**
   * Start timer sync for a battle
   */
  startTimerSync(battleId: string, callbacks: TimerCallbacks = {}): void {
    this.battleId = battleId;
    this.callbacks = callbacks;
    this.currentState.isActive = true;

    // Initialize state for demo mode
    if (battleId === 'demo-battle') {
      this.currentState = {
        phase: BattlePhase.COUNTDOWN,
        countdown: TIMER_CONFIG.countdownDuration,
        battleTime: 0,
        isActive: true,
      };
    }

    // Start polling server for timer updates
    this.syncInterval = setInterval(() => {
      this.syncWithServer();
    }, 1000); // Sync every second

    // Initial sync
    this.syncWithServer();
  }

  /**
   * Stop timer sync
   */
  stopTimerSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.localTimerInterval) {
      clearInterval(this.localTimerInterval);
      this.localTimerInterval = null;
    }
    this.battleId = null;
    this.currentState.isActive = false;
  }

  /**
   * Get current timer state
   */
  getCurrentState(): TimerState {
    return { ...this.currentState };
  }

  /**
   * Sync timer state with server
   */
  private async syncWithServer(): Promise<void> {
    if (!this.battleId) return;

    // For demo mode or when no auth, use local timer fallback
    if (this.battleId === 'demo-battle') {
      this.useLocalTimerFallback();
      return;
    }

    try {
      // Get auth token from Redux store
      const state = store.getState() as any;
      const token = state?.auth?.token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/battle/${this.battleId}/timer`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.warn('Failed to sync timer with server:', response.status);
        // Fall back to local timer if server is unavailable
        this.useLocalTimerFallback();
        return;
      }

      const data = await response.json();
      if (!data.success) {
        console.warn('Server returned error for timer sync:', data.error);
        // Fall back to local timer if server returns error
        this.useLocalTimerFallback();
        return;
      }

      const serverState = data.data;
      const previousState = { ...this.currentState };

      // Update current state
      this.currentState = {
        phase: serverState.phase,
        countdown: serverState.countdown,
        battleTime: serverState.battleTime,
        isActive: serverState.isActive,
      };

      // Trigger callbacks for state changes
      if (previousState.countdown !== this.currentState.countdown) {
        this.callbacks.onCountdownUpdate?.(this.currentState.countdown);
      }

      if (previousState.phase !== this.currentState.phase) {
        this.callbacks.onPhaseChange?.(this.currentState.phase);
      }

      // Check for battle end
      if (this.currentState.phase === BattlePhase.COMPLETE && previousState.phase !== BattlePhase.COMPLETE) {
        // Determine winner based on battle state (this would need to be enhanced)
        this.callbacks.onBattleEnd?.('enemy'); // Default for now
      }
    } catch (error) {
      console.error('Timer sync error:', error);
      // Fall back to local timer if network error
      this.useLocalTimerFallback();
    }
  }

  /**
   * Use local timer fallback when server is unavailable
   */
  private useLocalTimerFallback(): void {
    // Only initialize local timer once
    if (this.localTimerInterval) return;

    console.log('Using local timer fallback for demo mode');
    
    // Start local countdown
    this.localTimerInterval = setInterval(() => {
      if (this.currentState.phase === BattlePhase.COUNTDOWN) {
        if (this.currentState.countdown > 0) {
          this.currentState.countdown--;
          this.callbacks.onCountdownUpdate?.(this.currentState.countdown);
        } else {
          // Countdown finished, start battle phase
          this.currentState.phase = BattlePhase.ACTIVE;
          this.currentState.countdown = 0;
          this.currentState.battleTime = 0;
          this.callbacks.onPhaseChange?.(BattlePhase.ACTIVE);
        }
      } else if (this.currentState.phase === BattlePhase.ACTIVE) {
        this.currentState.battleTime++;
        if (this.currentState.battleTime >= TIMER_CONFIG.battleDuration) {
          // Battle time expired
          this.currentState.phase = BattlePhase.COMPLETE;
          this.callbacks.onBattleEnd?.('enemy');
          this.stopTimerSync();
        }
      }
    }, 1000);
  }

  /**
   * Get timer configuration
   */
  getTimerConfig(): BattleTimerConfig {
    return TIMER_CONFIG;
  }
} 