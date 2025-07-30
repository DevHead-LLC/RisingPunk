/**
 * @file BattleCountdownOverlay.tsx
 * @description Full-screen countdown overlay for battle initialization
 */

import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = {
  countdown: number;
  isVisible: boolean;
};

export const BattleCountdownOverlay = React.memo(({ countdown, isVisible }: Props) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.5)).current;

  React.useEffect(() => {
    const animations = [
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      isVisible 
        ? Animated.spring(scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
        : Animated.timing(scale, { toValue: 0.5, duration: 200, useNativeDriver: true })
    ];
    
    Animated.parallel(animations).start();
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.countdownContainer, { transform: [{ scale }] }]}>
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.countdownLabel}>BATTLE STARTING</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#4717F6',
    textShadowColor: 'rgba(71, 23, 246, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 16,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
