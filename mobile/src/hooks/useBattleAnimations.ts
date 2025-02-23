import { useRef } from 'react';
import { Animated } from 'react-native';

// IMPORTANT: Keep this hook for managing all battle-related animations
export const useBattleAnimations = () => {
  // Animation values
  const networkOpacity = useRef(new Animated.Value(0)).current;
  const deploymentOpacity = useRef(new Animated.Value(1)).current;
  const battalionOpacity = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;
  const resultsOpacity = useRef(new Animated.Value(0)).current;

  // IMPORTANT: Centralize animation functions
  const startBattleTransition = (onComplete?: () => void) => {
    // Coordinate all animations
    Animated.parallel([
      // Fade out countdown
      Animated.timing(countdownOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      // Transition battalions
      Animated.parallel([
        Animated.timing(deploymentOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(battalionOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      onComplete?.();
    });
  };

  const showBattleResults = (onComplete?: () => void) => {
    Animated.timing(resultsOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onComplete?.();
    });
  };

  // IMPORTANT: Initialize network visibility
  const showNetwork = () => {
    networkOpacity.setValue(1);
  };

  return {
    // Animation values
    networkOpacity,
    deploymentOpacity,
    battalionOpacity,
    countdownOpacity,
    resultsOpacity,
    // Animation functions
    startBattleTransition,
    showBattleResults,
    showNetwork,
  };
}; 