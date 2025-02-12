import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

type Props = {
  timeRemaining?: number;
  isCountdown?: boolean;
};

export const BattleHeader = React.memo(({ timeRemaining = 0, isCountdown }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        {isCountdown ? 'BATTLE STARTING' : 'SYSTEM BREACH IN PROGRESS'}
      </Text>
      <Text style={styles.timerText}>
        {isCountdown ? `${timeRemaining}` : `${timeRemaining}s`}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  statusText: {
    color: '#4717F6',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
  }
}); 