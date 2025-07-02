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

  // Track animation cleanup to prevent memory leaks
  const animationCleanupRef = useRef<(() => void) | null>(null);

  // Changes the battle phase and plays appropriate animations
  const transitionTo = useCallback((newPhase: BattlePhase) => {
    const oldPhase = phase;
    
    // Clean up any existing animations to prevent memory leaks
    if (animationCleanupRef.current) {
      animationCleanupRef.current();
      animationCleanupRef.current = null;
    }

    switch (newPhase) {
      case 'deployment':
        // Shows deployment zone
        const deploymentAnimation = Animated.timing(deploymentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        });
        deploymentAnimation.start();
        animationCleanupRef.current = () => deploymentAnimation.stop();
        break;

      case 'countdown':
        // Hides deployment, shows network and battalions
        const countdownAnimations = Animated.parallel([
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
        ]);
        countdownAnimations.start();
        animationCleanupRef.current = () => countdownAnimations.stop();
        break;

      case 'active':
        // Ensure countdown overlay disappears smoothly
        const countdownFadeAnimation = Animated.timing(countdownOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        });
        countdownFadeAnimation.start();
        animationCleanupRef.current = () => countdownFadeAnimation.stop();
        break;

      case 'complete':
        // Shows results overlay
        const completeAnimation = Animated.timing(resultsOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        });
        completeAnimation.start();
        animationCleanupRef.current = () => completeAnimation.stop();
        break;
    }
    setPhase(newPhase);
  }, [phase, deploymentOpacity, battalionOpacity, networkOpacity, countdownOpacity, resultsOpacity]);

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

    // Store cleanup function
    const cleanupInterval = () => {
      clearInterval(timer);
    };
    animationCleanupRef.current = cleanupInterval;
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
    const resultsAnimation = Animated.timing(resultsOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });
    resultsAnimation.start(() => {
      onComplete?.();
    });
    animationCleanupRef.current = () => resultsAnimation.stop();
  }, [resultsOpacity]);

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    if (animationCleanupRef.current) {
      animationCleanupRef.current();
      animationCleanupRef.current = null;
    }
  }, []);

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
    cleanup,
  };
}; 