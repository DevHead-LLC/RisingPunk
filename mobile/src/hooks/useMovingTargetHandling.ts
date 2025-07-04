import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { createMovingTargetTracker, handleMovingTargetUpdates, MovingTargetTracker } from '../utils/movingTargetHandler';
import { BOT_CATEGORIES } from '../utils/battleConstants';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';

export interface MovingTargetHandlingConfig {
  target: any;
  isUser: boolean;
  userBattalions?: any[];
  enemyBattalions?: any[];
  onPathAdjustment: (newIntersection: { x: number, y: number }) => void;
}

export function useMovingTargetHandling() {
  const movingTargetTrackerRef = useRef<MovingTargetTracker | null>(null);
  const movingTargetIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const getAnimatedPosition = useCallback((position: Animated.ValueXY) => {
    return {
      x: (position.x as any)._value || 0,
      y: (position.y as any)._value || 0
    };
  }, []);

  const startMovingTargetTracking = useCallback((
    config: MovingTargetHandlingConfig,
    attackerBattalion: any
  ) => {
    // Only track if targeting a battalion
    if (config.target.type !== 'battalion') {
      return;
    }

    const enemyBatts = config.isUser ? config.enemyBattalions : config.userBattalions;
    const targetBattalion = enemyBatts?.[config.target.index];
    
    if (!targetBattalion) {
      return;
    }

    // Create moving target tracker
    movingTargetTrackerRef.current = createMovingTargetTracker(
      targetBattalion,
      config.isUser,
      config.userBattalions || [],
      config.enemyBattalions || []
    );

    // Start monitoring target position changes
    movingTargetIntervalRef.current = setInterval(() => {
      if (!movingTargetTrackerRef.current) return;

      const currentAttackerPos = getAnimatedPosition(attackerBattalion.position);
      
      const pathAdjusted = handleMovingTargetUpdates(
        movingTargetTrackerRef.current,
        attackerBattalion,
        currentAttackerPos,
        config.onPathAdjustment
      );

      if (pathAdjusted) {
        // Stop current animation if path was adjusted
        if (currentAnimationRef.current) {
          currentAnimationRef.current.stop();
        }
      }
    }, 100); // Check every 100ms for moving targets
  }, [getAnimatedPosition]);

  const stopMovingTargetTracking = useCallback(() => {
    if (movingTargetIntervalRef.current) {
      clearInterval(movingTargetIntervalRef.current);
      movingTargetIntervalRef.current = null;
    }
    
    movingTargetTrackerRef.current = null;
  }, []);

  const setCurrentAnimation = useCallback((animation: Animated.CompositeAnimation | null) => {
    currentAnimationRef.current = animation;
  }, []);

  return {
    startMovingTargetTracking,
    stopMovingTargetTracking,
    setCurrentAnimation,
    getAnimatedPosition
  };
} 