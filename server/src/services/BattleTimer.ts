import { EventEmitter } from 'events';
import { BATTLE_CONFIG } from '../config/battleConfig';
import { BattlePhase } from '../types/battle';

interface BattleTimer {
  battleId: string;
  countdown: number;
  battleTime: number;
  phase: BattlePhase;
  countdownInterval?: NodeJS.Timeout;
  battleInterval?: NodeJS.Timeout;
  isActive: boolean;
}

export class BattleTimerService extends EventEmitter {
  private static instance: BattleTimerService;
  private timers: Map<string, BattleTimer> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): BattleTimerService {
    if (!BattleTimerService.instance) {
      BattleTimerService.instance = new BattleTimerService();
    }
    return BattleTimerService.instance;
  }

  /**
   * Start a timer for a battle
   */
  public startTimer(battleId: string): void {
    if (this.timers.has(battleId)) {
      console.warn(`Timer already exists for battle ${battleId}`);
      return;
    }

    const timer: BattleTimer = {
      battleId,
      countdown: BATTLE_CONFIG.COUNTDOWN_DURATION,
      battleTime: 0,
      phase: BattlePhase.COUNTDOWN,
      isActive: true,
    };

    this.timers.set(battleId, timer);
    this.startCountdown(battleId);
  }

  /**
   * Stop a battle timer and clean up
   */
  public stopTimer(battleId: string): void {
    const timer = this.timers.get(battleId);
    if (!timer) {
      return;
    }

    // Clear intervals
    if (timer.countdownInterval) {
      clearInterval(timer.countdownInterval);
      timer.countdownInterval = undefined;
    }
    if (timer.battleInterval) {
      clearInterval(timer.battleInterval);
      timer.battleInterval = undefined;
    }

    timer.isActive = false;
    this.timers.delete(battleId);
    
    console.log(`Timer stopped for battle ${battleId}`);
  }

  /**
   * Stop all timers (for cleanup)
   */
  public stopAllTimers(): void {
    const battleIds = Array.from(this.timers.keys());
    battleIds.forEach(battleId => this.stopTimer(battleId));
  }

  /**
   * Get remaining time for a battle
   */
  public getTimeRemaining(battleId: string): { countdown: number; battleTime: number; phase: BattlePhase } | null {
    const timer = this.timers.get(battleId);
    if (!timer) {
      return null;
    }

    return {
      countdown: timer.countdown,
      battleTime: timer.battleTime,
      phase: timer.phase,
    };
  }

  /**
   * Check if a battle timer is active
   */
  public isTimerActive(battleId: string): boolean {
    const timer = this.timers.get(battleId);
    return timer?.isActive || false;
  }

  /**
   * Get all active battle IDs
   */
  public getActiveBattleIds(): string[] {
    return Array.from(this.timers.keys());
  }

  /**
   * Start countdown phase (3 seconds)
   */
  private startCountdown(battleId: string): void {
    const timer = this.timers.get(battleId);
    if (!timer) return;

    console.log(`Starting countdown for battle ${battleId}`);

    timer.countdownInterval = setInterval(() => {
      if (!timer.isActive) return;

      timer.countdown--;
      
      // Emit countdown update event
      this.emit('countdownUpdate', {
        battleId,
        countdown: timer.countdown,
        phase: timer.phase,
      });

      if (timer.countdown <= 0) {
        // Countdown finished, start battle phase
        this.startBattlePhase(battleId);
      }
    }, 1000); // Update every second
  }

  /**
   * Start battle phase (20 seconds)
   */
  private startBattlePhase(battleId: string): void {
    const timer = this.timers.get(battleId);
    if (!timer) return;

    // Clear countdown interval
    if (timer.countdownInterval) {
      clearInterval(timer.countdownInterval);
      timer.countdownInterval = undefined;
    }

    // Transition to active phase
    timer.phase = BattlePhase.ACTIVE;
    timer.countdown = 0;

    console.log(`Starting battle phase for battle ${battleId}`);

    // Emit phase change event
    this.emit('phaseChange', {
      battleId,
      phase: BattlePhase.ACTIVE,
      countdown: 0,
    });

    // Start battle timer
    timer.battleInterval = setInterval(() => {
      if (!timer.isActive) return;

      timer.battleTime++;
      
      // Emit battle time update event
      this.emit('battleTimeUpdate', {
        battleId,
        battleTime: timer.battleTime,
        phase: timer.phase,
      });

      if (timer.battleTime >= BATTLE_CONFIG.BATTLE_DURATION) {
        // Battle time limit reached
        this.endBattle(battleId);
      }
    }, 1000); // Update every second
  }

  /**
   * End battle and clean up
   */
  private endBattle(battleId: string): void {
    const timer = this.timers.get(battleId);
    if (!timer) return;

    // Clear battle interval
    if (timer.battleInterval) {
      clearInterval(timer.battleInterval);
      timer.battleInterval = undefined;
    }

    timer.phase = BattlePhase.COMPLETE;
    timer.isActive = false;

    console.log(`Battle ${battleId} ended after ${timer.battleTime} seconds`);

    // Emit battle end event
    this.emit('battleEnd', {
      battleId,
      battleTime: timer.battleTime,
      phase: BattlePhase.COMPLETE,
    });

    // Clean up timer
    this.timers.delete(battleId);
  }

  /**
   * Force end a battle (for testing or manual intervention)
   */
  public forceEndBattle(battleId: string): void {
    const timer = this.timers.get(battleId);
    if (!timer) {
      console.warn(`No active timer found for battle ${battleId}`);
      return;
    }

    console.log(`Force ending battle ${battleId}`);
    this.endBattle(battleId);
  }

  /**
   * Get timer statistics for monitoring
   */
  public getTimerStats(): { activeBattles: number; totalTimers: number } {
    return {
      activeBattles: this.timers.size,
      totalTimers: this.timers.size,
    };
  }
} 