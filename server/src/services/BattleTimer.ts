import { EventEmitter } from 'events';
import { BattlePhase } from '../types/battle';

const TIMER_CONFIG = {
  COUNTDOWN_DURATION: 3,
  BATTLE_DURATION: 45,
} as const;

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
      countdown: TIMER_CONFIG.COUNTDOWN_DURATION,
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
    if (!timer) return;

    this.clearTimerIntervals(timer);
    timer.isActive = false;
    this.timers.delete(battleId);
    console.log(`Timer stopped for battle ${battleId}`);
  }

  /**
   * Stop all timers (for cleanup)
   */
  public stopAllTimers(): void {
    Array.from(this.timers.keys()).forEach(battleId => this.stopTimer(battleId));
  }

  /**
   * Get remaining time for a battle
   */
  public getTimeRemaining(battleId: string): { countdown: number; battleTime: number; timeRemaining: number; phase: BattlePhase } | null {
    const timer = this.timers.get(battleId);
    if (!timer) return null;
    
    // Calculate time remaining (45 down to 0)
    const timeRemaining = timer.phase === BattlePhase.ACTIVE ? 
      TIMER_CONFIG.BATTLE_DURATION - timer.battleTime : 
      timer.countdown;
    
    return {
      countdown: timer.countdown,
      battleTime: timer.battleTime,
      timeRemaining: timeRemaining,
      phase: timer.phase,
    };
  }

  /**
   * Check if a battle timer is active
   */
  public isTimerActive(battleId: string): boolean {
    return this.timers.get(battleId)?.isActive || false;
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


    timer.countdownInterval = setInterval(() => {
      if (!timer.isActive) return;

      timer.countdown--;
      
      this.emit('countdownUpdate', {
        battleId,
        countdown: timer.countdown,
        phase: timer.phase,
      });

      if (timer.countdown <= 0) {
        this.startBattlePhase(battleId);
      }
    }, 1000);
  }

  /**
   * Start battle phase (45 seconds)
   */
  private startBattlePhase(battleId: string): void {
    const timer = this.timers.get(battleId);
    if (!timer) return;

    this.clearTimerIntervals(timer);
    timer.phase = BattlePhase.ACTIVE;
    timer.countdown = 0;

    this.emit('phaseChange', {
      battleId,
      phase: BattlePhase.ACTIVE,
      countdown: 0,
    });

    timer.battleInterval = setInterval(() => {
      if (!timer.isActive) return;

      timer.battleTime++;
      
      // Calculate time remaining (45 down to 0)
      const timeRemaining = TIMER_CONFIG.BATTLE_DURATION - timer.battleTime;
      
      this.emit('battleTimeUpdate', {
        battleId,
        battleTime: timer.battleTime,
        timeRemaining: timeRemaining,
        phase: timer.phase,
      });

      if (timer.battleTime >= TIMER_CONFIG.BATTLE_DURATION) {
        this.endBattle(battleId);
      }
    }, 1000);
  }

  /**
   * End battle and clean up
   */
  private endBattle(battleId: string): void {
    const timer = this.timers.get(battleId);
    if (!timer) return;

    this.clearTimerIntervals(timer);
    timer.phase = BattlePhase.COMPLETE;
    timer.isActive = false;


    this.emit('battleEnd', {
      battleId,
      battleTime: timer.battleTime,
      phase: BattlePhase.COMPLETE,
    });

    this.timers.delete(battleId);
  }

  /**
   * Clear timer intervals
   */
  private clearTimerIntervals(timer: BattleTimer): void {
    if (timer.countdownInterval) {
      clearInterval(timer.countdownInterval);
      timer.countdownInterval = undefined;
    }
    if (timer.battleInterval) {
      clearInterval(timer.battleInterval);
      timer.battleInterval = undefined;
    }
  }
} 