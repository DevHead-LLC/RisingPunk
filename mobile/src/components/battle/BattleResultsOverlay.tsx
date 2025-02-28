import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

type Props = {
  winner: 'user' | 'enemy';
  opacity: Animated.Value;
  onContinue: () => void;
  userLossPoints: number;
  enemyLossPoints: number;
};

export const BattleResultsOverlay = React.memo(({ 
  winner, 
  opacity, 
  onContinue,
  userLossPoints,
  enemyLossPoints
}: Props) => {
  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        <Text style={styles.resultText}>
          {winner === 'user' ? 'SYSTEM BREACH SUCCESSFUL' : 'BREACH REPELLED'}
        </Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>YOUR LOSSES:</Text>
            <Text style={[styles.statValue, { color: '#FF4136' }]}>
              {userLossPoints} pts
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>ENEMY LOSSES:</Text>
            <Text style={[styles.statValue, { color: '#FF4136' }]}>
              {enemyLossPoints} pts
            </Text>
          </View>

          {userLossPoints === enemyLossPoints && (
            <Text style={styles.tiebreaker}>
              DEFENDER ADVANTAGE ACTIVATED
            </Text>
          )}
        </View>

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
    marginBottom: 20,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tiebreaker: {
    color: '#4717F6',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#4717F6',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  buttonText: {
    color: '#4717F6',
    fontSize: 18,
    fontWeight: 'bold',
  }
}); 