import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { CountdownOverlay } from './CountdownOverlay';
import { BattleResultsOverlay } from './BattleResultsOverlay';

type Props = {
  countdown: number;
  showResults: boolean;
  battleWinner: 'user' | 'enemy';
  countdownOpacity: Animated.Value;
  resultsOpacity: Animated.Value;
  onClose: () => void;
  userLossPoints?: number;
  enemyLossPoints?: number;
};

export const BattleOverlays = React.memo(({
  countdown,
  showResults,
  battleWinner,
  countdownOpacity,
  resultsOpacity,
  onClose,
  userLossPoints = 0,
  enemyLossPoints = 0,
}: Props) => {
  return (
    <View style={styles.container}>
      {/* Countdown Overlay */}
      {countdown > 0 && (
        <CountdownOverlay 
          countdown={countdown}
          opacity={countdownOpacity}
        />
      )}

      {/* Results Overlay */}
      {showResults && (
        <BattleResultsOverlay
          winner={battleWinner}
          opacity={resultsOpacity}
          onContinue={onClose}
          userLossPoints={userLossPoints}
          enemyLossPoints={enemyLossPoints}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10, // Ensure overlays appear above network and units
  },
}); 