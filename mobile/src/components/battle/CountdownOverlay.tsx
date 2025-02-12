import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type Props = {
  countdown: number;
  opacity: Animated.Value;
};

export const CountdownOverlay = React.memo(({ countdown, opacity }: Props) => {
  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.countdownText}>{countdown}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  countdownText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#4717F6',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
}); 