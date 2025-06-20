/**
 * @hook useBattleStateMachine
 * @description Manages battle state transitions and phase coordination
 */

import { useCallback, useState, useRef } from 'react';
import { Animated } from 'react-native';

export type BattlePhase = 
  | 'initializing'  // Initial setup
  | 'deployment'    // Unit placement
  | 'countdown'     // Pre-battle countdown
  | 'active'        // Battle in progress
  | 'complete'      // Battle ended
  | 'results';      // Showing results

export const useBattleStateMachine = () => {
  // Create and own all animation values
  const networkOpacity = useRef(new Animated.Value(0)).current;
  const deploymentOpacity = useRef(new Animated.Value(1)).current;
  const battalionOpacity = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;
  const resultsOpacity = useRef(new Animated.Value(0)).current;

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

  // Utility function for showing network immediately
  const showNetwork = useCallback(() => {
    networkOpacity.setValue(1);
  }, [networkOpacity]);

  // Utility function for showing battle results
  const showBattleResults = useCallback((onComplete?: () => void) => {
    Animated.timing(resultsOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onComplete?.();
    });
  }, [resultsOpacity]);

  return {
    // Animation values
    networkOpacity,
    deploymentOpacity,
    battalionOpacity,
    countdownOpacity,
    resultsOpacity,
    // State
    phase,
    countdown,
    // Functions
    transitionTo,
    startBattle,
    endBattle,
    showNetwork,
    showBattleResults,
  };
}; 