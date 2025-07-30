/**
 * @file BattleOverlayManager.tsx
 * @description Self-contained battle overlay manager with direct server integration
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { BattlePhase } from '../../types/battleTypes';
import { BattleLoadingError } from './BattleLoadingError';
import { BattleCountdownOverlay } from './BattleCountdownOverlay';
import { BattleTimerDisplay } from './BattleTimerDisplay';
import { useBattleState } from '../../hooks/useBattleState';

// Server phase types (from server/src/types/battle.ts)
type ServerPhase = 'setup' | 'countdown' | 'active' | 'battle' | 'victory' | 'defeat' | 'complete';

// Map server phases to client phases
const mapServerPhaseToClientPhase = (serverPhase: ServerPhase | undefined): BattlePhase => {
  switch (serverPhase) {
    case 'setup':
    case 'countdown':
      return BattlePhase.COUNTDOWN;
    case 'active':
    case 'battle':
      return BattlePhase.ACTIVE;
    case 'victory':
    case 'defeat':
    case 'complete':
      return BattlePhase.COMPLETE;
    default:
      return BattlePhase.COUNTDOWN;
  }
};

interface BattleOverlayManagerProps {
  battleId: string;
}

export const BattleOverlayManager: React.FC<BattleOverlayManagerProps> = ({
  battleId,
}) => {
  // Track logged errors to prevent spam
  const loggedErrors = useRef<Set<string>>(new Set());

  const {
    data: battleState,
    isLoading: battleLoading,
    error: battleError,
  } = useBattleState({
    battleId,
    pollingInterval: 1000,
  });

  // SIMPLE LOG: Only log problems (once per error)
  useEffect(() => {
    if (battleError) {
      // Create a unique key for this error to prevent duplicate logging
      const errorKey = JSON.stringify(battleError);
      if (!loggedErrors.current.has(errorKey)) {
        console.log('❌ OVERLAY API ERROR:', battleError);
        loggedErrors.current.add(errorKey);
      }
    }
  }, [battleError]);

  const renderOverlays = React.useMemo(() => {
    if (!battleState) return null;

    // Extract timer data from server response
    const phase = battleState.phase;
    const timeRemaining = battleState.timeRemaining || 20;
    const maxBattleTime = 20; // Fixed battle duration

    // Map server phase to client phase
    const clientPhase = mapServerPhaseToClientPhase(phase);

    // Calculate battle time from time remaining for the timer display
    const battleTime = maxBattleTime - timeRemaining;

    // Determine if we're in countdown phase and show countdown overlay
    // Server sends timeRemaining: 3,2,1 during countdown phase
    const isCountdownPhase = clientPhase === BattlePhase.COUNTDOWN && timeRemaining <= 3 && timeRemaining > 0;
    const countdownValue = isCountdownPhase ? timeRemaining : 0;

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Battle timer - always rendered and visible during countdown and active phases */}
        <BattleTimerDisplay
          battleTime={battleTime}
          maxBattleTime={maxBattleTime}
          isVisible={clientPhase === BattlePhase.COUNTDOWN || clientPhase === BattlePhase.ACTIVE}
        />

        {/* Countdown overlay - rendered on top when in COUNTDOWN phase */}
        {isCountdownPhase && countdownValue > 0 && (
          <BattleCountdownOverlay countdown={countdownValue} isVisible={true} />
        )}

        {/* No overlay for COMPLETE phase */}
      </View>
    );
  }, [battleState]);

  return (
    <BattleLoadingError
      isLoading={battleLoading}
      error={battleError}
      loadingText="Loading overlays..."
      errorText="Failed to load overlays"
      errorSubtext="Please try again"
    >
      {renderOverlays}
    </BattleLoadingError>
  );
};

const styles = StyleSheet.create({
  // Styles moved to BattleLoadingError component
});
