// Implementation of @battle-core-mechanics.mdc#Update-Timing-Hierarchy
import { BattleAnimationController } from './BattleAnimationController';
import { BattleStateManager } from './BattleStateManager';
import { BattlePhase } from './BattleTypes';

// Helper function to get current time in a test-friendly way
const getNow = () => {
  try {
    return performance.now();
  } catch (e) {
    return Date.now();
  }
};

export class BattleUpdateManager {
  private stateManager: BattleStateManager;
  private animationController: BattleAnimationController;
  private lastFrameTime: number;
  private animationFrameId?: number;
  private globalTimerId?: NodeJS.Timeout;
  private isBackground: boolean = false;
  private readonly TARGET_FRAME_TIME = 16.67; // ~60fps
  private readonly BACKGROUND_FRAME_TIME = 100; // 10fps in background

  constructor(stateManager: BattleStateManager, animationController: BattleAnimationController) {
    this.stateManager = stateManager;
    this.animationController = animationController;
    this.lastFrameTime = getNow();
  }

  public startAnimationLoop(frameCallback: () => void): void {
    const animate = () => {
      const currentTime = getNow();
      const deltaTime = currentTime - this.lastFrameTime;
      const targetTime = this.isBackground ? this.BACKGROUND_FRAME_TIME : this.TARGET_FRAME_TIME;
      
      if (deltaTime >= targetTime) {
        this.lastFrameTime = currentTime - (deltaTime % targetTime);
        frameCallback();
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.lastFrameTime = getNow();
    this.animationFrameId = requestAnimationFrame(animate);
    this.startGlobalTimer();
  }

  private startGlobalTimer(): void {
    // Clear any existing timer
    if (this.globalTimerId) {
      clearInterval(this.globalTimerId);
    }

    // Immediate update to ensure state is current
    this.stateManager.processStateQueue();

    // Set up 1-second interval for state updates
    this.globalTimerId = setInterval(() => {
      const currentState = this.stateManager.getState();
      if (currentState.phase === BattlePhase.COMBAT && currentState.timeRemaining > 0) {
        this.stateManager.processStateQueue();
        this.stateManager.updateState({
          timeUpdate: currentState.timeRemaining - 1
        }).catch(error => {
          console.error('Failed to update timer:', error);
        });
      }
    }, 1000);
  }

  public setBackgroundMode(isBackground: boolean): void {
    this.isBackground = isBackground;
    this.lastFrameTime = getNow(); // Reset frame timing when switching modes
  }

  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    if (this.globalTimerId) {
      clearInterval(this.globalTimerId);
      this.globalTimerId = undefined;
    }

    this.lastFrameTime = getNow();
    this.isBackground = false;
  }
} 