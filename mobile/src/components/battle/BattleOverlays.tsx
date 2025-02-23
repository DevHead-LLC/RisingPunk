import React from 'react';
import { Animated } from 'react-native';
import { CountdownOverlay } from './CountdownOverlay';
import { BattleResultsOverlay } from './BattleResultsOverlay';

type Props = {
  countdown: number;
  showResults: boolean;
  battleWinner: 'user' | 'enemy';
  countdownOpacity: Animated.Value;
  resultsOpacity: Animated.Value;
  onClose: () => void;
};

export const BattleOverlays = React.memo(({
  countdown,
  showResults,
  battleWinner,
  countdownOpacity,
  resultsOpacity,
  onClose,
}: Props) => {
  return (
    <>
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
        />
      )}
    </>
  );
}); 