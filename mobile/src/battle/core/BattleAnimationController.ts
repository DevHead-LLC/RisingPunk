// Implementation of @battle-core-mechanics.mdc#Update-Timing-Hierarchy
import { Animated, Easing } from 'react-native';
import { Position } from './types';
import { BattleStateManager } from './BattleStateManager';

// Helper function to get current time in a test-friendly way
const getNow = () => {
  try {
    return performance.now();
  } catch (e) {
    return Date.now();
  }
};

interface AnimationConfig {
  duration: number;
  startTime: number;
  startPos: Position;
  endPos: Position;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

export class BattleAnimationController {
  private frameCallbacks: Set<() => void>;
  private fallbackEnabled: boolean;
  private fallbackTimer: NodeJS.Timeout | null;
  private frameTimings: number[];
  private readonly MAX_FRAME_SAMPLES = 60;
  private readonly MIN_DURATION = 10; // Minimum animation duration in ms
  private readonly MAX_DURATION = 2000; // Maximum animation duration in ms
  private animationFrameId: number | null;
  private activeAnimations: Map<string, AnimationConfig>;
  private stateManager: BattleStateManager;

  constructor(stateManager: BattleStateManager) {
    this.frameCallbacks = new Set();
    this.fallbackEnabled = false;
    this.fallbackTimer = null;
    this.frameTimings = [];
    this.animationFrameId = null;
    this.activeAnimations = new Map();
    this.stateManager = stateManager;
  }

  public requestFrame(callback: () => void): void {
    this.frameCallbacks.add(callback);
    
    if (this.fallbackEnabled) {
      this.ensureFallbackTimer();
    } else {
      requestAnimationFrame(() => this.executeFrame());
    }
  }

  public enableFallback(): void {
    this.fallbackEnabled = true;
    this.ensureFallbackTimer();
  }

  public disableFallback(): void {
    this.fallbackEnabled = false;
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private ensureFallbackTimer(): void {
    if (!this.fallbackTimer) {
      this.fallbackTimer = setInterval(() => {
        this.executeFrame();
      }, 100); // Slower updates in background (10fps)
    }
  }

  private executeFrame = () => {
    const start = performance.now();
    
    // Process any pending animations
    this.processAnimations();
    
    // Request next frame if we have active animations
    if (this.activeAnimations.size > 0) {
      this.animationFrameId = requestAnimationFrame(this.executeFrame);
    }
    
    const duration = performance.now() - start;
    if (duration > 16) { // Log if frame took longer than 16ms (60fps)
      console.warn(`Frame took ${duration}ms to execute`);
    }
  };

  private processAnimations() {
    const currentTime = performance.now();
    
    // Process each active animation
    this.activeAnimations.forEach((animation, id) => {
      const progress = (currentTime - animation.startTime) / animation.duration;
      
      if (progress >= 1) {
        // Animation complete
        animation.onComplete?.();
        this.activeAnimations.delete(id);
      } else {
        // Update animation state
        const easedProgress = this.easeInOutCubic(progress);
        animation.onUpdate?.(easedProgress);
      }
    });
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public startAnimationLoop() {
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.executeFrame);
    }
  }

  public stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public animateBattalion(battalionId: string, targetPosition: Position, duration: number) {
    const battalion = this.stateManager.getState().battalions.get(battalionId);
    if (!battalion) return;

    const startPosition = { ...battalion.position };
    
    this.activeAnimations.set(battalionId, {
      startTime: performance.now(),
      duration,
      startPos: startPosition,
      endPos: targetPosition,
      onUpdate: (progress: number) => {
        const newPosition = {
          x: startPosition.x + (targetPosition.x - startPosition.x) * progress,
          y: startPosition.y + (targetPosition.y - startPosition.y) * progress
        };
        
        this.stateManager.updateState({
          battalionUpdates: new Map([[battalionId, { position: newPosition }]])
        });
      },
      onComplete: () => {
        this.stateManager.updateState({
          battalionUpdates: new Map([[battalionId, { position: targetPosition }]])
        });
      }
    });

    this.startAnimationLoop();
  }

  public animateAttack(attackerId: string, targetId: string, duration: number) {
    const attacker = this.stateManager.getState().battalions.get(attackerId);
    const target = this.stateManager.getState().battalions.get(targetId);
    if (!attacker || !target) return;

    const startPosition = { ...attacker.position };
    const targetPosition = { ...target.position };
    
    this.activeAnimations.set(attackerId, {
      startTime: performance.now(),
      duration,
      startPos: startPosition,
      endPos: targetPosition,
      onUpdate: (progress: number) => {
        const newPosition = {
          x: startPosition.x + (targetPosition.x - startPosition.x) * progress,
          y: startPosition.y + (targetPosition.y - startPosition.y) * progress
        };
        
        this.stateManager.updateState({
          battalionUpdates: new Map([[attackerId, { position: newPosition }]])
        });
      },
      onComplete: () => {
        // Reset position after attack
        this.stateManager.updateState({
          battalionUpdates: new Map([[attackerId, { position: startPosition }]])
        });
      }
    });

    this.startAnimationLoop();
  }

  private trackFrameTiming(duration: number): void {
    this.frameTimings.push(duration);
    if (this.frameTimings.length > this.MAX_FRAME_SAMPLES) {
      this.frameTimings.shift();
    }

    // Log warning if frame time exceeds target (16.67ms for 60fps)
    if (duration > 16.67 * 1.5) {
      console.warn(`Frame time exceeded target: ${duration.toFixed(2)}ms`);
    }
  }

  public getAverageFrameTime(): number {
    if (this.frameTimings.length === 0) return 0;
    const sum = this.frameTimings.reduce((a, b) => a + b, 0);
    return sum / this.frameTimings.length;
  }

  public calculateAttackDuration(speed: number): number {
    if (speed <= 0) {
      throw new Error('Speed must be positive');
    }
    // Duration is inversely proportional to speed
    // Ensure duration stays within bounds
    const calculatedDuration = 1000 / speed;
    return Math.max(this.MIN_DURATION, Math.min(this.MAX_DURATION, calculatedDuration));
  }

  public interpolatePosition(startPos: Position, endPos: Position, progress: number): Position {
    // Ensure progress is between 0 and 1
    progress = Math.max(0, Math.min(1, progress));
    
    // Apply easing function (ease-out-cubic)
    const eased = 1 - Math.pow(1 - progress, 3);
    
    return {
      x: startPos.x + (endPos.x - startPos.x) * eased,
      y: startPos.y + (endPos.y - startPos.y) * eased
    };
  }

  public createAttackAnimation(startPos: Position, endPos: Position, speed: number): AnimationConfig {
    return {
      duration: this.calculateAttackDuration(speed),
      startTime: getNow(),
      startPos,
      endPos
    };
  }

  public getAnimationProgress(animation: AnimationConfig): number {
    const elapsed = getNow() - animation.startTime;
    return Math.min(1, elapsed / animation.duration);
  }

  public getCurrentPosition(animation: AnimationConfig): Position {
    const progress = this.getAnimationProgress(animation);
    return this.interpolatePosition(animation.startPos, animation.endPos, progress);
  }

  public isAnimationComplete(animation: AnimationConfig): boolean {
    return this.getAnimationProgress(animation) >= 1;
  }

  public update(deltaTime: number): void {
    // Update any active animations
    this.executeFrame();
  }
} 