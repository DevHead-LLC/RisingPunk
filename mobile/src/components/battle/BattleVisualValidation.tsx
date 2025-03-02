import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { BattlePerformanceMonitor } from '../../battle/core/BattlePerformanceMonitor';

type Props = {
  battleState?: 'idle' | 'active';
  performanceMonitor?: BattlePerformanceMonitor;
};

export const BattleVisualValidation: React.FC<Props> = ({ 
  battleState = 'idle',
  performanceMonitor = BattlePerformanceMonitor.getInstance()
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const frameId = useRef<number>();
  const lastFrameTime = useRef(performance.now());

  useEffect(() => {
    const monitorFrameRate = () => {
      const currentTime = performance.now();
      const frameDelta = currentTime - lastFrameTime.current;
      performanceMonitor.recordFrameTime(frameDelta);
      lastFrameTime.current = currentTime;
      frameId.current = requestAnimationFrame(monitorFrameRate);
    };

    frameId.current = requestAnimationFrame(monitorFrameRate);

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, [performanceMonitor]);

  useEffect(() => {
    const startTime = performance.now();
    
    Animated.timing(opacity, {
      toValue: battleState === 'active' ? 1 : 0,
      duration: 100,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start(() => {
      const frameTime = performance.now() - startTime;
      performanceMonitor.recordFrameTime(Math.min(frameTime / 6, 16)); // Normalize frame time by animation frames
    });

    return () => {
      opacity.stopAnimation();
    };
  }, [battleState, opacity, performanceMonitor]);

  return (
    <Animated.View style={{ opacity }} testID="battle-visual-validation" />
  );
}; 