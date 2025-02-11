import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

type Props = {
  winner: 'user' | 'enemy';
  opacity: Animated.Value;
  onContinue: () => void;
};

export const BattleResultsOverlay = React.memo(({ winner, opacity, onContinue }: Props) => {
  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        <Text style={styles.resultText}>
          {winner === 'user' ? 'SYSTEM BREACH SUCCESSFUL' : 'BREACH REPELLED'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  resultText: {
    color: '#4717F6',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  button: {
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#4717F6',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#4717F6',
    fontSize: 18,
    fontWeight: 'bold',
  }
}); 