/**
 * @hook useBattleStateMachine
 * @description Manages battle state transitions and phase coordination
 */

import { useCallback, useState, useRef } from 'react';
import { Animated } from 'react-native';

// Different stages the battle goes through
export type BattlePhase = 
  | 'initializing'  // Initial setup
  | 'deployment'    // Unit placement
  | 'countdown'     // Pre-battle countdown
  | 'active'        // Battle in progress
  | 'complete'      // Battle ended
  | 'results';      // Showing results

// Manages the battle flow and animations between different phases
export const useBattleStateMachine = () => {
  // Animation values that control what's visible on screen
  const networkOpacity = useRef(new Animated.Value(0)).current;
  const deploymentOpacity = useRef(new Animated.Value(1)).current;
  const battalionOpacity = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;
  const resultsOpacity = useRef(new Animated.Value(0)).current;

  // Current battle phase and countdown timer
  const [phase, setPhase] = useState<BattlePhase>('initializing');
  const [countdown, setCountdown] = useState(3);

  // Changes the battle phase and plays appropriate animations
  const transitionTo = useCallback((newPhase: BattlePhase) => {
    switch (newPhase) {
      case 'deployment':
        // Shows deployment zone
        Animated.timing(deploymentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
        break;

      case 'countdown':
        // Hides deployment, shows network and battalions
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
        // Shows results overlay
        Animated.timing(resultsOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
        break;
    }
    setPhase(newPhase);
  }, [deploymentOpacity, battalionOpacity, networkOpacity, resultsOpacity]);

  // Starts the battle with a 3-second countdown
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

  // Ends the battle and shows results after a delay
  const endBattle = useCallback((winner: 'user' | 'enemy') => {
    transitionTo('complete');
    setTimeout(() => {
      transitionTo('results');
    }, 1000);
  }, [transitionTo]);

  // Shows the network immediately without animation
  const showNetwork = useCallback(() => {
    networkOpacity.setValue(1);
  }, [networkOpacity]);

  // Shows battle results with optional callback when done
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