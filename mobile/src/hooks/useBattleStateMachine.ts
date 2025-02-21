/**
 * @hook useBattleStateMachine
 * @description Manages battle state transitions and phase coordination
 */

import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

type BattlePhase = 
  | 'initializing'  // Initial setup
  | 'deployment'    // Unit placement
  | 'countdown'     // Pre-battle countdown
  | 'active'        // Battle in progress
  | 'complete'      // Battle ended
  | 'results';      // Showing results

export const useBattleStateMachine = (
  deploymentOpacity: Animated.Value,
  battalionOpacity: Animated.Value,
  networkOpacity: Animated.Value,
  resultsOpacity: Animated.Value
) => {
  const [phase, setPhase] = useState<BattlePhase>('initializing');
  const [countdown, setCountdown] = useState(3);

  const transitionTo = useCallback((newPhase: BattlePhase) => {
    switch (newPhase) {
      case 'deployment':
        Animated.timing(deploymentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
        break;

      case 'countdown':
        Animated.parallel([
          Animated.timing(deploymentOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(battalionOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(networkOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ]).start();
        break;

      case 'complete':
        Animated.timing(resultsOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
        break;
    }
    setPhase(newPhase);
  }, [deploymentOpacity, battalionOpacity, networkOpacity, resultsOpacity]);

  const startBattle = useCallback(() => {
    transitionTo('countdown');
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          transitionTo('active');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [transitionTo]);

  const endBattle = useCallback((winner: 'user' | 'enemy') => {
    transitionTo('complete');
    setTimeout(() => {
      transitionTo('results');
    }, 1000);
  }, [transitionTo]);

  return {
    phase,
    countdown,
    transitionTo,
    startBattle,
    endBattle
  };
}; 