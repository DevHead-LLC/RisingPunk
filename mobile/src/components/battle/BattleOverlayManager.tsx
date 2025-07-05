/**
 * @file BattleOverlayManager.tsx
 * @description Manages and displays battle overlays (countdown, timer) for the battle screen. Clean, non-legacy, single source of truth.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useBattleState } from '../../hooks/useBattleState';
import { BattlePhase } from '../../types/battleTypes';
import { BattleCountdownOverlay } from './BattleCountdownOverlay';
import { BattleTimerDisplay } from './BattleTimerDisplay';

export const BattleOverlayManager: React.FC = () => {
  const {
    state: { phase, countdown, battleTime, maxBattleTime },
    startCountdown,
  } = useBattleState();

  // Start countdown on mount
  useEffect(() => {
    startCountdown();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {phase === BattlePhase.COUNTDOWN && (
        <BattleCountdownOverlay countdown={countdown} isVisible={true} />
      )}
      {phase === BattlePhase.ACTIVE && (
        <BattleTimerDisplay
          battleTime={battleTime}
          maxBattleTime={maxBattleTime}
          isVisible={true}
        />
      )}
      {/* No overlay for COMPLETE phase */}
    </View>
  );
}; 