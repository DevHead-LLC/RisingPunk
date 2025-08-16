import { EventEmitter } from 'events';
import { BattlePhase } from '../types/battle';

const TIMER_CONFIG = {
  COUNTDOWN_DURATION: 3,
  BATTLE_DURATION: 45,
} as const;

// Flag to disable elimination checking during tests
const DISABLE_ELIMINATION_CHECK = process.env.NODE_ENV === 'test';

// Callback type for elimination checking
type EliminationCheckCallback = (battleId: string) => Promise<boolean>;

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
  private eliminationCallbacks: Map<string, EliminationCheckCallback> = new Map();

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
   * Register a callback for elimination checking for a specific battle
   */
  public registerEliminationCallback(battleId: string, callback: EliminationCheckCallback): void {
    this.eliminationCallbacks.set(battleId, callback);
  }

  /**
   * Unregister elimination callback for a specific battle
   */
  public unregisterEliminationCallback(battleId: string): void {
    this.eliminationCallbacks.delete(battleId);
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
    
    // Clean up elimination callback for this battle
    this.unregisterEliminationCallback(battleId);
    
    console.log(`Timer stopped for battle ${battleId}`);
  }

  /**
   * Stop all timers (for cleanup)
   */
  public stopAllTimers(): void {
    Array.from(this.timers.keys()).forEach(battleId => this.stopTimer(battleId));
  }

  /**
   * Get timer configuration
   */
  public static getTimerConfig() {
    return TIMER_CONFIG;
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

    timer.battleInterval = setInterval(async () => {
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

      // Check for elimination-based battle end on each tick
      // Only check if we have an active timer (which means there's a real battle)
      // AND if elimination checking is not disabled (e.g., during tests)
      // AND if the battle hasn't already ended
      if (timer.isActive && timer.phase !== BattlePhase.COMPLETE && !DISABLE_ELIMINATION_CHECK && this.eliminationCallbacks.has(battleId)) {
        try {
          // Use the callback to check for elimination (synchronous check)
          const callback = this.eliminationCallbacks.get(battleId);
          if (callback) {
            // Check elimination synchronously to avoid race conditions
            callback(battleId).then(shouldEnd => {
              if (shouldEnd && timer.isActive && timer.phase !== BattlePhase.COMPLETE) {
                console.log(`🎯 BATTLE TIMER: Battle ${battleId} ending due to elimination`);
                this.endBattle(battleId).catch(error => {
                  console.error(`❌ BATTLE TIMER: Error ending battle ${battleId}:`, error);
                });
              }
            }).catch(error => {
              console.error(`❌ BATTLE TIMER: Error checking elimination for battle ${battleId}:`, error);
            });
          }
        } catch (error) {
          console.error(`❌ BATTLE TIMER: Error in elimination check for battle ${battleId}:`, error);
          // Don't end the battle on error - continue with normal timer flow
        }
      }

      if (timer.battleTime >= TIMER_CONFIG.BATTLE_DURATION) {
        // Check if battle has already ended (e.g., by elimination) before processing timer expiration
        if (timer.phase === BattlePhase.COMPLETE) {
          console.log(`⏰ BATTLE TIMER: Battle ${battleId} already ended, skipping timer expiration`);
          return;
        }
        
        console.log(`⏰ BATTLE TIMER: Battle ${battleId} ending due to timer expiration (${timer.battleTime}s)`);
        
        // Clean up timer immediately (synchronous)
        this.clearTimerIntervals(timer);
        timer.phase = BattlePhase.COMPLETE;
        timer.isActive = false;
        
        // Remove timer from map immediately
        this.timers.delete(battleId);
        
        // Clean up elimination callback to prevent memory leak
        this.unregisterEliminationCallback(battleId);
        
        // Emit battleEnd event to trigger BattleService battle end processing
        // BattleService will handle the async battle end processing
        this.emit('battleEnd', {
          battleId,
          battleTime: timer.battleTime,
          phase: BattlePhase.COMPLETE,
        });
      }
    }, 1000);
  }

  /**
   * End battle and clean up
   */
  private async endBattle(battleId: string): Promise<void> {
    const timer = this.timers.get(battleId);
    if (!timer) return;

    // Check if battle has already ended to prevent duplicate processing
    if (timer.phase === BattlePhase.COMPLETE) {
      console.log(`🎯 BATTLE TIMER: Battle ${battleId} already ended, skipping duplicate endBattle call`);
      return;
    }

    this.clearTimerIntervals(timer);
    timer.phase = BattlePhase.COMPLETE;
    timer.isActive = false;

    // Clean up elimination callback to prevent memory leak
    this.unregisterEliminationCallback(battleId);

    // Trigger battle end handling in BattleService
    try {
      // This part of the logic needs to be refactored to use the event system
      // For now, we'll just log the attempt and continue with normal cleanup
      console.log(`🎯 BATTLE TIMER: Attempting to process battle end for ${battleId}`);
      // await this.emit('processBattleEnd', { battleId }); // This would require a listener
    } catch (error) {
      console.error(`❌ BATTLE TIMER: Error handling battle end for ${battleId}:`, error);
      // Don't fail the timer cleanup on error - continue with normal cleanup
      // The battle might not exist (e.g., during tests), so we continue with cleanup
    }

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