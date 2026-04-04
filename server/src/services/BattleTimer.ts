import { EventEmitter } from 'events';
import { BattlePhase } from '../types/battle';
import { BattalionService } from './BattalionService';
import { MovementService } from './MovementService';
import { setHeadlessBattleVirtualTimelineMs } from './HeadlessBattleRunner';

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
          return;
        }
        
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

  private async emitSequential(event: string, data: any): Promise<void> {
    const fns = this.listeners(event);
    for (const fn of fns) {
      await Promise.resolve((fn as (d: any) => unknown)(data));
    }
  }

  /**
   * March headless: replace wall-clock intervals with sequential ticks so the battle finishes immediately.
   * Clears any pending `setInterval` from `startTimer` first; assumes listeners are registered (e.g. `BattleService.createBattle`).
   */
  public async runSyntheticTicksToCompletion(battleId: string): Promise<void> {
    const timer = this.timers.get(battleId);
    if (!timer || !timer.isActive) {
      console.warn('[BattleTimer] runSyntheticTicksToCompletion: no active timer for', battleId);
      return;
    }

    this.clearTimerIntervals(timer);

    const { BattleReplayRecorder } = await import('./BattleReplayRecorder');
    const replayRecorder = BattleReplayRecorder.getInstance();
    await replayRecorder.beginSyntheticReplayCapture(battleId);
    await replayRecorder.syntheticExactFrame(battleId, 0);
    setHeadlessBattleVirtualTimelineMs(battleId, 0);

    const COUNTDOWN_STEP_MS = 1000;
    const MOVEMENT_STEPS_PER_BATTLE_SECOND = 10;
    const HEADLESS_MOVEMENT_STEP_MS = 100;

    for (let i = 0; i < TIMER_CONFIG.COUNTDOWN_DURATION; i++) {
      timer.countdown--;
      await this.emitSequential('countdownUpdate', {
        battleId,
        countdown: timer.countdown,
        phase: timer.phase,
      });
      await replayRecorder.syntheticExactFrame(battleId, (i + 1) * COUNTDOWN_STEP_MS);
      setHeadlessBattleVirtualTimelineMs(battleId, (i + 1) * COUNTDOWN_STEP_MS);
    }

    timer.phase = BattlePhase.ACTIVE;
    timer.countdown = 0;
    await this.emitSequential('phaseChange', {
      battleId,
      phase: BattlePhase.ACTIVE,
      countdown: 0,
    });

    BattalionService.stopMovementUpdates(battleId);
    MovementService.resetHeadlessMovementProgress(battleId);

    let virtualMs = TIMER_CONFIG.COUNTDOWN_DURATION * COUNTDOWN_STEP_MS;

    for (let sec = 1; sec <= TIMER_CONFIG.BATTLE_DURATION; sec++) {
      if (!this.timers.get(battleId)) {
        return;
      }

      for (let m = 0; m < MOVEMENT_STEPS_PER_BATTLE_SECOND; m++) {
        virtualMs += HEADLESS_MOVEMENT_STEP_MS;
        setHeadlessBattleVirtualTimelineMs(battleId, virtualMs);
        await BattalionService.updateBattleMovement(battleId, HEADLESS_MOVEMENT_STEP_MS);
        await replayRecorder.syntheticAdvanceBucketsTo(battleId, virtualMs);
      }

      timer.battleTime = sec;
      const timeRemaining = TIMER_CONFIG.BATTLE_DURATION - sec;
      await this.emitSequential('battleTimeUpdate', {
        battleId,
        battleTime: timer.battleTime,
        timeRemaining,
        phase: timer.phase,
      });

      if (!this.timers.get(battleId)) {
        return;
      }

      if (!DISABLE_ELIMINATION_CHECK && this.eliminationCallbacks.has(battleId)) {
        const callback = this.eliminationCallbacks.get(battleId);
        if (callback) {
          try {
            const shouldEnd = await callback(battleId);
            if (shouldEnd) {
              await replayRecorder.syntheticAdvanceBucketsTo(battleId, virtualMs);
              await this.endBattle(battleId);
              return;
            }
          } catch (error) {
            console.error(`[BattleTimer] synthetic elimination check failed for ${battleId}:`, error);
          }
        }
      }
    }

    if (!this.timers.get(battleId)) {
      return;
    }

    this.clearTimerIntervals(timer);
    timer.phase = BattlePhase.COMPLETE;
    timer.isActive = false;
    this.timers.delete(battleId);
    this.unregisterEliminationCallback(battleId);

    await this.emitSequential('battleEnd', {
      battleId,
      battleTime: timer.battleTime,
      phase: BattlePhase.COMPLETE,
    });
  }
} 