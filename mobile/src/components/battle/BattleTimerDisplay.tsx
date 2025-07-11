/**
 * @file BattleTimerDisplay.tsx
 * @description Battle timer display for active battle phase
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  battleTime: number;
  maxBattleTime: number;
  isVisible: boolean;
};

export const BattleTimerDisplay = React.memo(({ battleTime, maxBattleTime, isVisible }: Props) => {
  if (!isVisible) {return null;}

  const timeRemaining = maxBattleTime - battleTime;
  const progressPercentage = (battleTime / maxBattleTime) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.statusText}>SYSTEM BREACH IN PROGRESS</Text>
        <Text style={styles.timerText}>{timeRemaining}s</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercentage}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    color: '#4717F6',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    padding: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4717F6',
    borderRadius: 3,
  },
});
